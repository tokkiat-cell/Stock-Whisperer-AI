import finnhub from 'finnhub';

const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY;
const finnhubClient = new finnhub.DefaultApi();

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  companyName?: string;
}

export async function searchStocks(query: string): Promise<{ symbol: string; name: string }[]> {
  return new Promise((resolve) => {
    finnhubClient.symbolSearch(query.toUpperCase(), (error: any, data: any) => {
      if (error || !data?.result) {
        console.error("Finnhub Search Error:", error);
        resolve([]);
        return;
      }
      const results = data.result.slice(0, 10).map((item: any) => ({
        symbol: item.symbol,
        name: item.description || item.symbol
      }));
      resolve(results);
    });
  });
}

export async function getStockQuote(symbol: string): Promise<MarketData | null> {
  return new Promise((resolve) => {
    finnhubClient.quote(symbol.toUpperCase(), (error: any, data: any) => {
      if (error || !data || data.c === 0) {
        console.error(`Finnhub Quote Error for ${symbol}:`, error);
        resolve(null);
        return;
      }
      resolve({
        symbol: symbol.toUpperCase(),
        price: data.c || 0,
        change: data.d || 0,
        changePercent: data.dp || 0,
        companyName: symbol.toUpperCase()
      });
    });
  });
}

export async function getCompanyProfile(symbol: string): Promise<string | null> {
  return new Promise((resolve) => {
    finnhubClient.companyProfile2({ symbol: symbol.toUpperCase() }, (error: any, data: any) => {
      if (error || !data) {
        resolve(null);
        return;
      }
      resolve(data.name || symbol);
    });
  });
}
