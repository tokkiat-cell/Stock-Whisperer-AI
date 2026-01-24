import { getUncachableStripeClient } from '../stripeClient';

async function seedStripeProducts() {
  console.log('Creating Stripe products and prices...');
  
  const stripe = await getUncachableStripeClient();
  
  const products = [
    {
      name: 'stockwhisperer Basic',
      description: 'Essential AI trading analysis tools for individual traders',
      metadata: { tier: 'basic' },
      price: 990, // $9.90 in cents
    },
    {
      name: 'stockwhisperer Pro',
      description: 'Advanced AI trading with market scanning and integrations',
      metadata: { tier: 'pro' },
      price: 4999, // $49.99 in cents
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

    // Check if price already exists for this product
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    const matchingPrice = existingPrices.data.find(
      (p) => p.unit_amount === productData.price && p.recurring?.interval === 'month'
    );

    if (matchingPrice) {
      console.log(`Price for "${productData.name}" already exists: ${matchingPrice.id}`);
      console.log(`  -> ${productData.metadata.tier.toUpperCase()}_PRICE_ID=${matchingPrice.id}`);
    } else {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: productData.price,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: productData.metadata,
      });
      console.log(`Created price for "${productData.name}": ${price.id}`);
      console.log(`  -> ${productData.metadata.tier.toUpperCase()}_PRICE_ID=${price.id}`);
    }
  }

  console.log('\nDone! Add these price IDs to your environment variables:');
  console.log('STRIPE_BASIC_PRICE_ID=<basic_price_id>');
  console.log('STRIPE_PRO_PRICE_ID=<pro_price_id>');
}

seedStripeProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding Stripe products:', err);
    process.exit(1);
  });
