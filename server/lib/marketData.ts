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
    const results = await (yahooFinance as any).search(query.toUpperCase());
    return results.quotes.map(quote => ({
      symbol: quote.symbol,
      name: (quote as any).shortname || (quote as any).longname || quote.symbol
    })).slice(0, 10);
  } catch (error) {
    console.error("Yahoo Finance Search Error:", error);
    return [];
  }
}

export async function getStockQuote(symbol: string): Promise<MarketData | null> {
  try {
    const quote = await (yahooFinance as any).quote(symbol.toUpperCase());
    
    if (!quote) return null;

    return {
      symbol: quote.symbol,
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      companyName: quote.shortName || quote.longName
    };
  } catch (error) {
    console.error(`Yahoo Finance Quote Error for ${symbol}:`, error);
    
    try {
      const searchResult = await yahooFinance.search(symbol.toUpperCase());
      const firstQuote = searchResult.quotes.find(q => q.symbol === symbol.toUpperCase());
      if (firstQuote) {
        return {
          symbol: firstQuote.symbol,
          price: (firstQuote as any).regularMarketPrice || 0,
          change: (firstQuote as any).regularMarketChange || 0,
          changePercent: (firstQuote as any).regularMarketChangePercent || 0,
          companyName: (firstQuote as any).shortname || (firstQuote as any).longname
        };
      }
    } catch (searchError) {
      console.error(`Yahoo Finance Fallback Search Error for ${symbol}:`, searchError);
    }
    
    return null;
  }
}
