import { getUncachableStripeClient } from '../stripeClient';

async function seedStripeProducts() {
  console.log('Creating Stripe products and prices...');
  
  const stripe = await getUncachableStripeClient();
  
  const products = [
    {
      name: 'stockwhisperer Basic',
      description: 'Essential AI trading analysis tools for individual traders',
      metadata: { tier: 'basic' },
      prices: [
        { amount: 990, interval: 'month' as const, envKey: 'STRIPE_BASIC_PRICE_ID' },
        { amount: 9900, interval: 'year' as const, envKey: 'STRIPE_BASIC_YEARLY_PRICE_ID' },
      ],
    },
    {
      name: 'stockwhisperer Pro Plan',
      description: 'Advanced AI trading with market scanning and integrations',
      metadata: { tier: 'pro' },
      prices: [
        { amount: 2990, interval: 'month' as const, envKey: 'STRIPE_PRO_PRICE_ID' },
        { amount: 29900, interval: 'year' as const, envKey: 'STRIPE_PRO_YEARLY_PRICE_ID' },
      ],
    },
  ];

  for (const productData of products) {
    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `name:"${productData.name}"`,
    });

    let product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`Product "${productData.name}" already exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        metadata: productData.metadata,
      });
      console.log(`Created product "${productData.name}": ${product.id}`);
    }

    // Check if prices already exist for this product
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    for (const priceConfig of productData.prices) {
      const matchingPrice = existingPrices.data.find(
        (p) => p.unit_amount === priceConfig.amount && p.recurring?.interval === priceConfig.interval
      );

      if (matchingPrice) {
        console.log(`Price for "${productData.name}" (${priceConfig.interval}ly) already exists: ${matchingPrice.id}`);
        console.log(`  -> ${priceConfig.envKey}=${matchingPrice.id}`);
      } else {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceConfig.amount,
          currency: 'usd',
          recurring: { interval: priceConfig.interval },
          metadata: { ...productData.metadata, interval: priceConfig.interval },
        });
        console.log(`Created price for "${productData.name}" (${priceConfig.interval}ly): ${price.id}`);
        console.log(`  -> ${priceConfig.envKey}=${price.id}`);
      }
    }
  }

  console.log('\nDone! Add these price IDs to your environment variables:');
  console.log('STRIPE_BASIC_PRICE_ID=<basic_monthly_price_id>');
  console.log('STRIPE_BASIC_YEARLY_PRICE_ID=<basic_yearly_price_id>');
  console.log('STRIPE_PRO_PRICE_ID=<pro_price_id>');
}

seedStripeProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding Stripe products:', err);
    process.exit(1);
  });
