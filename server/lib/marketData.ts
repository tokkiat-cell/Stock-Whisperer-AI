import YahooFinance from "yahoo-finance2";
import { getAlphaVantageQuote } from "./alphaVantageClient";

const yahooFinance = new YahooFinance();

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  companyName?: string;
  dataSource?: "yahoo" | "alphavantage";
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
      console.error(`Yahoo Finance: No data for ${symbol}, trying Alpha Vantage...`);
      return await getAlphaVantageStockQuote(symbol);
    }
    
    return {
      symbol: quote.symbol || symbol.toUpperCase(),
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      companyName: quote.shortName || quote.longName || symbol.toUpperCase(),
      dataSource: "yahoo"
    };
  } catch (error) {
    console.error(`Yahoo Finance Quote Error for ${symbol}:`, error);
    return await getAlphaVantageStockQuote(symbol);
  }
}

async function getAlphaVantageStockQuote(symbol: string): Promise<MarketData | null> {
  try {
    const avQuote = await getAlphaVantageQuote(symbol);
    if (!avQuote || avQuote.price === 0) {
      console.error(`Alpha Vantage: No data for ${symbol}`);
      return null;
    }
    
    return {
      symbol: avQuote.symbol,
      price: avQuote.price,
      change: avQuote.change,
      changePercent: avQuote.changePercent,
      dataSource: "alphavantage"
    };
  } catch (error) {
    console.error(`Alpha Vantage Quote Error for ${symbol}:`, error);
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

export type ChartInterval = "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1wk" | "1mo";

// Get lookback period based on interval
function getLookbackPeriod(interval: ChartInterval): { period1: Date; period2: Date } {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (interval) {
    case "1m":
      startDate.setDate(startDate.getDate() - 7); // 7 days for 1-minute data
      break;
    case "5m":
      startDate.setDate(startDate.getDate() - 30); // 30 days for 5-minute data
      break;
    case "15m":
      startDate.setDate(startDate.getDate() - 60); // 60 days for 15-minute data
      break;
    case "30m":
      startDate.setDate(startDate.getDate() - 60); // 60 days for 30-minute data
      break;
    case "1h":
      startDate.setDate(startDate.getDate() - 90); // 90 days for 1-hour data
      break;
    case "1d":
      startDate.setFullYear(startDate.getFullYear() - 1); // 1 year for daily data
      break;
    case "1wk":
      startDate.setFullYear(startDate.getFullYear() - 3); // 3 years for weekly data
      break;
    case "1mo":
      startDate.setFullYear(startDate.getFullYear() - 10); // 10 years for monthly data
      break;
  }
  
  return { period1: startDate, period2: endDate };
}

export async function getStockHistory(symbol: string, interval: ChartInterval = "1d"): Promise<{
  candles: CandleData[];
  movingAverages: {
    ma20: MovingAverageData[];
    ma40: MovingAverageData[];
    ma100: MovingAverageData[];
    ma200: MovingAverageData[];
  };
  quote?: {
    bid?: number;
    ask?: number;
    bidSize?: number;
    askSize?: number;
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
  };
} | null> {
  try {
    const { period1, period2 } = getLookbackPeriod(interval);
    
    const historical = await yahooFinance.chart(symbol.toUpperCase(), {
      period1,
      period2,
      interval,
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
    
    // Also fetch current quote for bid/ask data
    let quote: any = {};
    try {
      const quoteData = await yahooFinance.quote(symbol.toUpperCase());
      if (quoteData) {
        quote = {
          bid: quoteData.bid,
          ask: quoteData.ask,
          bidSize: quoteData.bidSize,
          askSize: quoteData.askSize,
          regularMarketPrice: quoteData.regularMarketPrice,
          regularMarketChange: quoteData.regularMarketChange,
          regularMarketChangePercent: quoteData.regularMarketChangePercent,
        };
      }
    } catch (quoteError) {
      console.error(`Failed to fetch quote for ${symbol}:`, quoteError);
    }
    
    return {
      candles,
      movingAverages: {
        ma20: calculateMA(20),
        ma40: calculateMA(40),
        ma100: calculateMA(100),
        ma200: calculateMA(200),
      },
      quote,
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

// Get date components in Eastern Time
function getETComponents(date: Date): { hours: number; minutes: number; day: number; month: number; year: number; totalMinutes: number } {
  const etTime = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  return {
    hours,
    minutes,
    day: etTime.getDate(),
    month: etTime.getMonth(),
    year: etTime.getFullYear(),
    totalMinutes: hours * 60 + minutes
  };
}

// Check if given time (in ET total minutes) is within premarket (4:00-9:30 AM ET)
function isPremarketMinutes(totalMinutes: number): boolean {
  return totalMinutes >= 240 && totalMinutes < 570; // 4:00 AM to 9:30 AM ET
}

// Check if we're currently in premarket hours
function isCurrentlyPremarket(): boolean {
  const now = getETComponents(new Date());
  return isPremarketMinutes(now.totalMinutes);
}

// Check if we're currently in regular market hours (9:30 AM - 4:00 PM ET, weekdays)
function isCurrentlyMarketHours(): boolean {
  const now = new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const day = etTime.getDay();
  
  if (day === 0 || day === 6) return false; // Weekend
  return totalMinutes >= 570 && totalMinutes < 960; // 9:30 AM to 4:00 PM ET
}

// Get premarket/market movers using 5-minute intraday chart data
// During premarket: shows premarket movers from premarket candles
// During market hours: shows current movers from latest candles
// After hours: shows after-hours movers
export async function getPremarketGainersAndLosers(): Promise<{
  gainers: PremarketMover[];
  losers: PremarketMover[];
}> {
  try {
    const allMovers: PremarketMover[] = [];
    const batchSize = 10;
    
    // Calculate time range for today's data (get last 2 days to ensure we have previous close)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 2);
    
    const inPremarket = isCurrentlyPremarket();
    const inMarketHours = isCurrentlyMarketHours();
    const sessionType = inPremarket ? "premarket" : (inMarketHours ? "market" : "after-hours");
    
    console.log(`Market scan [${sessionType}]: Fetching 5-minute chart data for ${POPULAR_STOCKS.length} stocks...`);
    
    // Fetch 5-minute chart data for each popular stock
    for (let i = 0; i < POPULAR_STOCKS.length; i += batchSize) {
      const batch = POPULAR_STOCKS.slice(i, i + batchSize);
      const promises = batch.map(async (symbol) => {
        try {
          // Fetch 5-minute intraday chart
          const chart = await yahooFinance.chart(symbol, {
            period1: startDate,
            period2: endDate,
            interval: '5m',
            includePrePost: true, // Include premarket and afterhours data
          });
          
          if (!chart || !chart.quotes || chart.quotes.length === 0) {
            return null;
          }
          
          // Filter valid candles with close prices
          const allCandles = chart.quotes.filter((q: any) => 
            q.close !== null && q.close !== undefined && q.close > 0 && q.date
          );
          
          if (allCandles.length === 0) return null;
          
          // Get current date in ET for proper day comparison
          const todayET = getETComponents(new Date());
          const todayETDate = todayET.day;
          const todayETMonth = todayET.month;
          const todayETYear = todayET.year;
          
          // Filter for today's premarket candles using ET timezone (single conversion per candle)
          const todaysPremarketCandles = allCandles.filter((q: any) => {
            const candleET = getETComponents(new Date(q.date));
            const isSameDay = candleET.day === todayETDate && 
                              candleET.month === todayETMonth &&
                              candleET.year === todayETYear;
            const isPremarket = isPremarketMinutes(candleET.totalMinutes);
            return isSameDay && isPremarket;
          });
          
          // For premarket scan: only use premarket candles
          // Skip stocks that don't have premarket trading activity
          if (todaysPremarketCandles.length === 0) {
            return null;
          }
          
          // Get the most recent premarket candle
          const latestCandle = todaysPremarketCandles[todaysPremarketCandles.length - 1];
          const currentPrice = latestCandle.close;
          
          // Get previous close ONLY from chart metadata (most reliable)
          // Do not use fallback calculations to ensure accuracy
          const previousClose = chart.meta?.previousClose || chart.meta?.chartPreviousClose;
          
          if (!previousClose || previousClose === 0 || !currentPrice) return null;
          
          // Calculate change from previous close to current 5-minute candle
          const change = currentPrice - previousClose;
          const changePercent = (change / previousClose) * 100;
          
          // Get volume from latest candle
          const volume = latestCandle.volume;
          
          // Get company name from chart meta
          const name = chart.meta?.shortName || chart.meta?.longName || symbol;
          
          return {
            symbol: symbol,
            name: name,
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            volume: volume,
          } as PremarketMover;
        } catch (err) {
          // Ignore individual stock errors
          return null;
        }
      });
      
      const results = await Promise.all(promises);
      results.forEach(r => { if (r) allMovers.push(r); });
    }

    // Sort by % change to find biggest movers
    const sorted = [...allMovers].sort((a, b) => b.changePercent - a.changePercent);
    
    // Gainers are those with positive change, sorted by highest % gain
    const gainers = sorted
      .filter(m => m.changePercent > 0)
      .slice(0, 20);
    
    // Losers are those with negative change, sorted by most negative
    const losers = sorted
      .filter(m => m.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 20);

    console.log(`Market scan complete (5m charts): ${gainers.length} gainers, ${losers.length} losers from ${allMovers.length} stocks`);
    
    return { gainers, losers };
  } catch (error) {
    console.error('Market Scan Error:', error);
    return { gainers: [], losers: [] };
  }
}
