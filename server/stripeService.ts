import { getUncachableStripeClient } from './stripeClient';

export class StripeService {
  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string, cancelAtPeriodEnd: boolean = false) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          cancel_at_period_end: cancelAtPeriodEnd ? 'true' : 'false',
        },
      },
    });
  }

  async createOneTimeCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async listProductsWithPrices() {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 10 });
    
    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({ product: product.id, active: true });
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
          prices: prices.data.map(price => ({
            id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring,
            metadata: price.metadata,
          })),
        };
      })
    );
    
    return productsWithPrices;
  }

  async getProduct(productId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.products.retrieve(productId);
  }

  async getSubscription(subscriptionId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product'],
    });
  }

  async updateSubscriptionCancelAtPeriodEnd(subscriptionId: string, cancelAtPeriodEnd: boolean) {
    const stripe = await getUncachableStripeClient();
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });
  }
}

export const stripeService = new StripeService();
