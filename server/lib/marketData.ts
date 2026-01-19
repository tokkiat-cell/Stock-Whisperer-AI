import yahooFinance from 'yahoo-finance2';

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  companyName?: string;
}

export async function searchStocks(query: string) {
  try {
    const results = await yahooFinance.search(query);
    return results.quotes.map(quote => ({
      symbol: quote.symbol,
      name: quote.shortname || quote.longname || quote.symbol
    })).slice(0, 10);
  } catch (error) {
    console.error("Yahoo Finance Search Error:", error);
    return [];
  }
}

export async function getStockQuote(symbol: string): Promise<MarketData | null> {
  try {
    const quote = await yahooFinance.quote(symbol);
    return {
      symbol: quote.symbol,
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      companyName: quote.shortName || quote.longName
    };
  } catch (error) {
    console.error(`Yahoo Finance Quote Error for ${symbol}:`, error);
    return null;
  }
}
