import { getUncachableStripeClient } from '../server/stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();
  
  console.log('Creating TradeMind subscription products...');

  const existingProducts = await stripe.products.search({ 
    query: "metadata['app']:'trademind'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping creation');
    console.log('Existing products:', existingProducts.data.map(p => p.name).join(', '));
    return;
  }

  const basicProduct = await stripe.products.create({
    name: 'TradeMind Basic',
    description: 'Essential AI trading analysis tools for individual traders',
    metadata: {
      app: 'trademind',
      tier: 'basic',
      features: 'ai_analysis,watchlist,alerts',
    },
  });

  const basicMonthly = await stripe.prices.create({
    product: basicProduct.id,
    unit_amount: 1999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'basic_monthly' },
  });

  const basicYearly = await stripe.prices.create({
    product: basicProduct.id,
    unit_amount: 19990,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { plan: 'basic_yearly' },
  });

  console.log(`Created: ${basicProduct.name} (${basicProduct.id})`);
  console.log(`  - Monthly: ${basicMonthly.id} ($${(basicMonthly.unit_amount || 0) / 100}/mo)`);
  console.log(`  - Yearly: ${basicYearly.id} ($${(basicYearly.unit_amount || 0) / 100}/yr)`);

  const proProduct = await stripe.products.create({
    name: 'TradeMind Pro',
    description: 'Advanced AI trading with market scanning and IBKR integration',
    metadata: {
      app: 'trademind',
      tier: 'pro',
      features: 'ai_analysis,watchlist,alerts,scanner,ibkr,priority_support',
    },
  });

  const proMonthly = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 4999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'pro_monthly' },
  });

  const proYearly = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 49990,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { plan: 'pro_yearly' },
  });

  console.log(`Created: ${proProduct.name} (${proProduct.id})`);
  console.log(`  - Monthly: ${proMonthly.id} ($${(proMonthly.unit_amount || 0) / 100}/mo)`);
  console.log(`  - Yearly: ${proYearly.id} ($${(proYearly.unit_amount || 0) / 100}/yr)`);

  console.log('\nProducts created successfully!');
  console.log('Run the app and webhooks will sync products to the database.');
}

createProducts().catch(console.error);
