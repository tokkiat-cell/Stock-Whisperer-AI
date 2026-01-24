import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

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
    const stripe = await getUncachableStripeClient();
    
    const webhookSecret = await sync.getWebhookSecret();
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    
    console.log(`Received webhook ${event.id}: ${event.type} for ${(event.data.object as any).id}`);

    await sync.processWebhook(payload, signature);

    await WebhookHandlers.handleCustomEvents(event, stripe);
  }

  static async handleCustomEvents(event: Stripe.Event, stripe: Stripe): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await WebhookHandlers.handleCheckoutCompleted(session, stripe);
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await WebhookHandlers.handleSubscriptionUpdate(subscription, stripe);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await WebhookHandlers.handleSubscriptionDeleted(subscription, stripe);
        break;
      }
    }
  }

  static async handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe): Promise<void> {
    const userId = session.metadata?.userId;
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    if (!userId) {
      console.error('Checkout completed but no userId in metadata');
      throw new Error('Missing userId in checkout session metadata');
    }

    if (!subscriptionId) {
      console.error('Checkout completed but no subscription ID');
      throw new Error('Missing subscription ID in checkout session');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const planTier = await WebhookHandlers.determineTierFromPriceId(subscription, stripe);

    console.log(`Checkout completed for user ${userId}, tier: ${planTier}, subscription: ${subscriptionId}`);

    const updated = await storage.updateUserSubscription(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      planTier: planTier,
    });

    if (!updated) {
      throw new Error(`Failed to update user ${userId} subscription`);
    }

    console.log(`User ${userId} subscription updated to ${planTier}`);
  }

  static async handleSubscriptionUpdate(subscription: Stripe.Subscription, stripe: Stripe): Promise<void> {
    const customerId = subscription.customer as string;
    const userId = subscription.metadata?.userId;
    
    let user = await WebhookHandlers.findUserByCustomerId(customerId);
    
    if (!user && userId) {
      user = { id: userId };
      await storage.updateUserSubscription(userId, {
        stripeCustomerId: customerId,
      });
    }
    
    if (!user) {
      console.log(`No user found for customer ${customerId} and no userId in metadata`);
      return;
    }

    const status = subscription.status;
    
    if (status === 'active' || status === 'trialing') {
      const planTier = await WebhookHandlers.determineTierFromPriceId(subscription, stripe);
      
      const updated = await storage.updateUserSubscription(user.id, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        planTier: planTier,
      });
      
      if (!updated) {
        throw new Error(`Failed to update user ${user.id} subscription`);
      }
      
      console.log(`User ${user.id} subscription updated to ${planTier}`);
    } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
      const updated = await storage.updateUserSubscription(user.id, {
        stripeSubscriptionId: null,
        planTier: 'free',
      });
      
      if (!updated) {
        throw new Error(`Failed to reset user ${user.id} subscription`);
      }
      
      console.log(`User ${user.id} subscription status ${status}, reverted to free`);
    }
  }

  static async handleSubscriptionDeleted(subscription: Stripe.Subscription, stripe: Stripe): Promise<void> {
    const customerId = subscription.customer as string;
    const userId = subscription.metadata?.userId;
    
    let user = await WebhookHandlers.findUserByCustomerId(customerId);
    
    if (!user && userId) {
      user = { id: userId };
    }
    
    if (!user) {
      console.log(`No user found for customer ${customerId} during subscription deletion`);
      return;
    }

    const updated = await storage.updateUserSubscription(user.id, {
      stripeSubscriptionId: null,
      planTier: 'free',
    });
    
    if (!updated) {
      throw new Error(`Failed to reset user ${user.id} to free tier`);
    }
    
    console.log(`User ${user.id} subscription deleted, reverted to free tier`);
  }

  static async findUserByCustomerId(customerId: string): Promise<{ id: string } | null> {
    const user = await storage.getUserByStripeCustomerId(customerId);
    return user ? { id: user.id } : null;
  }

  static async determineTierFromPriceId(subscription: Stripe.Subscription, stripe: Stripe): Promise<string> {
    const priceId = subscription.items.data[0]?.price?.id;
    
    if (!priceId) {
      console.warn('No price ID found in subscription, defaulting to basic');
      return 'basic';
    }

    const basicPriceId = process.env.STRIPE_BASIC_PRICE_ID;
    const basicYearlyPriceId = process.env.STRIPE_BASIC_YEARLY_PRICE_ID;
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
    const proYearlyPriceId = process.env.STRIPE_PRO_YEARLY_PRICE_ID;

    if (priceId === proPriceId || priceId === proYearlyPriceId) {
      return 'pro';
    }
    if (priceId === basicPriceId || priceId === basicYearlyPriceId) {
      return 'basic';
    }

    try {
      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const product = price.product as Stripe.Product;
      const productName = product.name?.toLowerCase() || '';
      
      console.log(`Determining tier from product name: ${productName}`);
      
      if (productName.includes('pro')) return 'pro';
      if (productName.includes('basic')) return 'basic';
    } catch (e) {
      console.error('Error fetching price details:', e);
    }

    console.warn(`Could not determine tier for price ${priceId}, defaulting to basic`);
    return 'basic';
  }
}
