import { storage } from "./storage";
import { getStockQuote } from "./lib/marketData";

const TOP_SP500 = [
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A" },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "GOOG", name: "Alphabet Inc. Class C" },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "COST", name: "Costco Wholesale Corporation" }
];

async function seed() {
  console.log("Seeding S&P 500 stocks...");
  for (const stock of TOP_SP500) {
    try {
      const quote = await getStockQuote(stock.symbol);
      await storage.upsertSp500Stock(
        stock.symbol, 
        stock.name, 
        quote?.price?.toString() || "0"
      );
      console.log(`Seeded ${stock.symbol}`);
    } catch (err) {
      console.error(`Failed to seed ${stock.symbol}:`, err);
    }
  }
  console.log("Seeding complete.");
  process.exit(0);
}

seed();
