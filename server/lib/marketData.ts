import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  companyName?: string;
}

export async function searchStocks(query: string): Promise<{ symbol: string; name: string }[]> {
  try {
    const result = await yahooFinance.search(query, { quotesCount: 10 });
    
    if (!result?.quotes) return [];
    
    return result.quotes
      .filter((item: any) => item.symbol && item.quoteType === "EQUITY")
      .slice(0, 10)
      .map((item: any) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol
      }));
  } catch (error) {
    console.error("Yahoo Finance Search Error:", error);
    return [];
  }
}

export async function getStockQuote(symbol: string): Promise<MarketData | null> {
  try {
    const quote = await yahooFinance.quote(symbol.toUpperCase());
    
    if (!quote || !quote.regularMarketPrice) {
      console.error(`Yahoo Finance: No data for ${symbol}`);
      return null;
    }
    
    return {
      symbol: quote.symbol || symbol.toUpperCase(),
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      companyName: quote.shortName || quote.longName || symbol.toUpperCase()
    };
  } catch (error) {
    console.error(`Yahoo Finance Quote Error for ${symbol}:`, error);
    return null;
  }
}

export async function getCompanyProfile(symbol: string): Promise<string | null> {
  try {
    const quote = await yahooFinance.quote(symbol.toUpperCase());
    return quote?.shortName || quote?.longName || symbol;
  } catch (error) {
    return null;
  }
}
