import { getStripeSync, getUncachableStripeClient } from './stripeClient';

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
      
      // Handle subscription created event to check for cancel_at_period_end metadata
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
      }
    } catch (customError: any) {
      // Don't fail the webhook if custom handling fails
      console.log('Custom webhook handling skipped or failed:', customError.message);
    }
  }
}
