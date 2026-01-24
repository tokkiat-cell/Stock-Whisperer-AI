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

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MovingAverageData {
  time: number;
  value: number;
}

export async function getStockHistory(symbol: string): Promise<{
  candles: CandleData[];
  movingAverages: {
    ma20: MovingAverageData[];
    ma40: MovingAverageData[];
    ma100: MovingAverageData[];
    ma200: MovingAverageData[];
  };
} | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    const historical = await yahooFinance.chart(symbol.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });
    
    if (!historical || !historical.quotes || historical.quotes.length === 0) {
      return null;
    }
    
    const candles = historical.quotes.map((q: any) => ({
      time: Math.floor(new Date(q.date).getTime() / 1000),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    })).filter((c: CandleData) => c.open && c.high && c.low && c.close);
    
    const calculateMA = (period: number): MovingAverageData[] => {
      const result: MovingAverageData[] = [];
      for (let i = period - 1; i < candles.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += candles[i - j].close;
        }
        result.push({
          time: candles[i].time,
          value: sum / period,
        });
      }
      return result;
    };
    
    return {
      candles,
      movingAverages: {
        ma20: calculateMA(20),
        ma40: calculateMA(40),
        ma100: calculateMA(100),
        ma200: calculateMA(200),
      },
    };
  } catch (error) {
    console.error(`Yahoo Finance History Error for ${symbol}:`, error);
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

export async function getBatchQuotes(symbols: string[]): Promise<Record<string, MarketData>> {
  const results: Record<string, MarketData> = {};
  
  // Fetch quotes in parallel with rate limiting (5 at a time)
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      try {
        const quote = await getStockQuote(symbol);
        if (quote) {
          results[symbol.toUpperCase()] = quote;
        }
      } catch (error) {
        console.error(`Failed to fetch quote for ${symbol}:`, error);
      }
    });
    await Promise.all(promises);
  }
  
  return results;
}

export interface PremarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'JPM', 'V',
  'UNH', 'XOM', 'JNJ', 'WMT', 'MA', 'PG', 'HD', 'CVX', 'MRK', 'KO',
  'ABBV', 'PEP', 'COST', 'AVGO', 'TMO', 'LLY', 'MCD', 'CSCO', 'ACN', 'ABT',
  'DHR', 'NKE', 'CMCSA', 'VZ', 'NFLX', 'ADBE', 'TXN', 'NEE', 'PM', 'WFC',
  'AMD', 'INTC', 'QCOM', 'CRM', 'BMY', 'UPS', 'RTX', 'T', 'BA', 'ORCL',
  'DIS', 'HON', 'IBM', 'LMT', 'GE', 'SBUX', 'CAT', 'LOW', 'DE', 'AXP',
  'AMGN', 'GILD', 'MDLZ', 'PLD', 'MMM', 'TJX', 'C', 'ADI', 'ISRG', 'BKNG',
  'PYPL', 'SQ', 'SHOP', 'SNAP', 'COIN', 'RIVN', 'LCID', 'PLTR', 'SOFI', 'NIO',
  'MRNA', 'ZM', 'DOCU', 'ROKU', 'ABNB', 'UBER', 'LYFT', 'HOOD', 'DKNG', 'RBLX',
  'CRWD', 'PANW', 'ZS', 'OKTA', 'NET', 'DDOG', 'SNOW', 'MDB', 'ESTC', 'PATH'
];

export async function getPremarketGainersAndLosers(): Promise<{
  gainers: PremarketMover[];
  losers: PremarketMover[];
}> {
  try {
    // Try screener first
    try {
      const [gainersResult, losersResult] = await Promise.all([
        yahooFinance.screener({
          scrIds: 'day_gainers',
          count: 25,
        }),
        yahooFinance.screener({
          scrIds: 'day_losers',
          count: 25,
        }),
      ]);

      const mapQuoteToMover = (quote: any): PremarketMover | null => {
        if (!quote || !quote.symbol || quote.regularMarketPrice === undefined) {
          return null;
        }
        return {
          symbol: quote.symbol,
          name: quote.shortName || quote.longName || quote.symbol,
          price: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          volume: quote.regularMarketVolume,
        };
      };

      const gainers = (gainersResult?.quotes || [])
        .map(mapQuoteToMover)
        .filter((m): m is PremarketMover => m !== null)
        .slice(0, 20);

      const losers = (losersResult?.quotes || [])
        .map(mapQuoteToMover)
        .filter((m): m is PremarketMover => m !== null)
        .slice(0, 20);

      if (gainers.length > 0 || losers.length > 0) {
        return { gainers, losers };
      }
    } catch (screenerError) {
      console.log('Yahoo screener failed, falling back to batch quotes:', screenerError);
    }

    // Fallback: fetch quotes for popular stocks and sort by % change
    const allMovers: PremarketMover[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < POPULAR_STOCKS.length; i += batchSize) {
      const batch = POPULAR_STOCKS.slice(i, i + batchSize);
      const promises = batch.map(async (symbol) => {
        try {
          const quote = await yahooFinance.quote(symbol);
          if (quote && quote.regularMarketPrice !== undefined) {
            return {
              symbol: quote.symbol || symbol,
              name: quote.shortName || quote.longName || symbol,
              price: quote.regularMarketPrice || 0,
              change: quote.regularMarketChange || 0,
              changePercent: quote.regularMarketChangePercent || 0,
              volume: quote.regularMarketVolume,
            };
          }
        } catch (err) {
          // Ignore individual stock errors
        }
        return null;
      });
      
      const results = await Promise.all(promises);
      results.forEach(r => { if (r) allMovers.push(r); });
    }

    // Sort by % change to find gainers and losers
    const sorted = [...allMovers].sort((a, b) => b.changePercent - a.changePercent);
    const gainers = sorted.slice(0, 20);
    const losers = sorted.slice(-20).reverse();

    return { gainers, losers };
  } catch (error) {
    console.error('Yahoo Finance Screener Error:', error);
    return { gainers: [], losers: [] };
  }
}
