import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    
    // Handle custom logic after sync processing
    try {
      const stripe = await getUncachableStripeClient();
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
      
      // Handle subscription created/updated event
      if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as any;
        const metadata = subscription.metadata || {};
        
        // Check if cancel_at_period_end was set to true in metadata
        if (metadata.cancel_at_period_end === 'true' && !subscription.cancel_at_period_end) {
          console.log(`Setting cancel_at_period_end for subscription ${subscription.id}`);
          await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: true,
          });
        }
        
        // Update user's plan tier based on product
        await this.updateUserPlanTier(subscription);
      }
      
      // Handle subscription deleted (cancelled)
      if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;
        
        // Find user by Stripe customer ID and reset to free tier
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.stripeCustomerId, customerId));
        
        if (user) {
          await storage.updateUserStripeInfo(user.id, {
            stripeSubscriptionId: undefined,
            planTier: 'free',
          });
          console.log(`Reset user ${user.id} to free tier after subscription cancelled`);
        }
      }
    } catch (customError: any) {
      // Don't fail the webhook if custom handling fails
      console.log('Custom webhook handling skipped or failed:', customError.message);
    }
  }
  
  private static async updateUserPlanTier(subscription: any): Promise<void> {
    try {
      const stripe = await getUncachableStripeClient();
      const customerId = subscription.customer;
      
      // Find user by Stripe customer ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId));
      
      if (!user) {
        console.log(`No user found for customer ${customerId}`);
        return;
      }
      
      // Get the product to determine plan tier
      const items = subscription.items?.data || [];
      if (items.length === 0) return;
      
      const priceId = items[0].price?.id;
      if (!priceId) return;
      
      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const product = price.product as any;
      const planTier = product?.metadata?.tier || 'basic';
      
      // Update user's plan tier
      await storage.updateUserStripeInfo(user.id, {
        stripeSubscriptionId: subscription.id,
        planTier,
      });
      console.log(`Updated user ${user.id} to ${planTier} tier`);
    } catch (error: any) {
      console.log('Failed to update user plan tier:', error.message);
    }
  }
}
