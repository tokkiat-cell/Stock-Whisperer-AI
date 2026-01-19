export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  companyName?: string;
}

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export async function searchStocks(query: string): Promise<{ symbol: string; name: string }[]> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`
    );
    const data = await response.json();
    
    if (!data?.result) return [];
    
    return data.result.slice(0, 10).map((item: any) => ({
      symbol: item.symbol,
      name: item.description || item.symbol
    }));
  } catch (error) {
    console.error("Finnhub Search Error:", error);
    return [];
  }
}

export async function getStockQuote(symbol: string): Promise<MarketData | null> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_API_KEY}`
    );
    const data = await response.json();
    
    if (!data || data.c === 0 || data.c === undefined) {
      console.error(`Finnhub: No data for ${symbol}`);
      return null;
    }
    
    return {
      symbol: symbol.toUpperCase(),
      price: data.c || 0,
      change: data.d || 0,
      changePercent: data.dp || 0,
      companyName: symbol.toUpperCase()
    };
  } catch (error) {
    console.error(`Finnhub Quote Error for ${symbol}:`, error);
    return null;
  }
}

export async function getCompanyProfile(symbol: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol.toUpperCase()}&token=${FINNHUB_API_KEY}`
    );
    const data = await response.json();
    return data?.name || symbol;
  } catch (error) {
    return null;
  }
}
