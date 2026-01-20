import { getUncachableStripeClient } from './stripeClient';
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

    try {
      const stripe = await getUncachableStripeClient();
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
      
      console.log(`Processing Stripe webhook: ${event.type}`);
      
      if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as any;
        const metadata = subscription.metadata || {};
        
        if (metadata.cancel_at_period_end === 'true' && !subscription.cancel_at_period_end) {
          console.log(`Setting cancel_at_period_end for subscription ${subscription.id}`);
          await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: true,
          });
        }
        
        await this.updateUserPlanTier(subscription);
      }
      
      if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;
        
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
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription, {
            expand: ['items.data.price.product'],
          });
          await this.updateUserPlanTier(subscription);
        }
      }
    } catch (error: any) {
      console.error('Webhook processing error:', error.message);
      throw error;
    }
  }
  
  private static async updateUserPlanTier(subscription: any): Promise<void> {
    try {
      const stripe = await getUncachableStripeClient();
      const customerId = subscription.customer;
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId));
      
      if (!user) {
        console.log(`No user found for customer ${customerId}`);
        return;
      }
      
      const items = subscription.items?.data || [];
      if (items.length === 0) return;
      
      const priceId = items[0].price?.id;
      if (!priceId) return;
      
      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const product = price.product as any;
      
      let planTier = 'basic';
      if (product?.metadata?.tier) {
        planTier = product.metadata.tier;
      } else if (product?.name?.toLowerCase().includes('pro')) {
        planTier = 'pro';
      } else if (product?.name?.toLowerCase().includes('basic')) {
        planTier = 'basic';
      }
      
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
