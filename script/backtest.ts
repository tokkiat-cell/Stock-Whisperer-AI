// Backtesting harness for the daily-bar setup patterns (Cupid, Roller Coaster, Tug of War).
//
// Methodology (see chat writeup for full rationale):
// - Walk-forward: each simulated "day" only sees candles up to and including that day.
//   The pattern functions are the EXACT same pure functions the live app calls
//   (analyzeCupidPattern / analyzeRollerCoasterPattern / analyzeTugOfWarPattern),
//   so this measures the real logic, not a re-implementation that could drift.
// - One open trade at a time per (symbol, pattern) — re-signaling on a still-open
//   setup doesn't count as a new independent trade.
// - Same-day ambiguity (a day's range touches both stop and target) is resolved
//   conservatively in favor of the stop — we don't have intraday granularity on
//   daily bars to know which was actually hit first.
// - Trades unresolved after MAX_HOLD_DAYS are closed at that day's close.
// - No transaction costs, slippage, or spread are modeled — real results will be worse.
// - Universe is today's well-known liquid large caps applied to past dates, which is
//   a mild survivorship bias (today's winners were, definitionally, still around).
//
// Run: npx tsx script/backtest.ts

import YahooFinance from "yahoo-finance2";
import { analyzeCupidPattern } from "../server/lib/cupidSetup";
import { analyzeRollerCoasterPattern } from "../server/lib/rollerCoasterSetup";
import { analyzeTugOfWarPattern } from "../server/lib/tugOfWarSetup";

const yahooFinance = new YahooFinance();

interface CandleData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const UNIVERSE = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "AMD", "NFLX", "CRM",
  "ADBE", "INTC", "PYPL", "SHOP", "UBER", "SNAP", "PINS", "RBLX",
  "COIN", "PLTR", "SNOW", "ROKU", "ZM", "DOCU", "CRWD", "NET",
  "ABNB", "BA", "DIS", "JPM", "GS", "V", "MA", "WMT", "TGT", "COST",
  "HD", "LOW", "NKE", "SBUX", "MCD", "PEP", "KO", "XOM", "CVX",
];

const HISTORY_YEARS = 2;
const MIN_WARMUP_CANDLES = 60; // matches production's candles.length < 30 guard with margin
const MAX_HOLD_DAYS = 20; // ~1 trading month
const MIN_CONFIDENCE = 40; // matches dayTradingScanner.ts's threshold for these 3 patterns

type PatternName = "Cupid" | "RollerCoaster" | "TugOfWar";

interface SimTrade {
  symbol: string;
  pattern: PatternName;
  signalDate: Date;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  outcome: "win" | "loss" | "timeout";
  rMultiple: number;
  holdDays: number;
}

async function getDailyHistory(symbol: string): Promise<CandleData[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - HISTORY_YEARS);

  try {
    const result: any = await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });
    if (!result?.quotes) return [];
    return result.quotes
      .filter((q: any) => q.open && q.high && q.low && q.close)
      .map((q: any) => ({
        date: new Date(q.date),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume || 0,
      }));
  } catch (e: any) {
    console.error(`  fetch failed for ${symbol}: ${e.message}`);
    return [];
  }
}

function detectAll(candles: CandleData[], symbol: string, name: string, currentPrice: number) {
  const results: { pattern: PatternName; confidence: number; entryPrice: number; stopLoss: number; targetPrice: number }[] = [];

  const cupid = analyzeCupidPattern(candles as any, symbol, name, currentPrice);
  if (cupid && cupid.patternDetected && cupid.confidence >= MIN_CONFIDENCE) {
    results.push({
      pattern: "Cupid",
      confidence: cupid.confidence,
      entryPrice: cupid.entryZone.high,
      stopLoss: cupid.stopLoss,
      targetPrice: cupid.targetPrice,
    });
  }

  const rc = analyzeRollerCoasterPattern(candles as any, symbol, name, currentPrice);
  if (rc && rc.patternDetected && rc.confidence >= MIN_CONFIDENCE) {
    results.push({
      pattern: "RollerCoaster",
      confidence: rc.confidence,
      entryPrice: rc.entryLevel,
      stopLoss: rc.stopLoss,
      targetPrice: rc.targetPrice,
    });
  }

  const tow = analyzeTugOfWarPattern(candles as any, symbol, name, currentPrice);
  if (tow && tow.patternDetected && tow.confidence >= MIN_CONFIDENCE) {
    results.push({
      pattern: "TugOfWar",
      confidence: tow.confidence,
      entryPrice: tow.entryLevel,
      stopLoss: tow.stopLoss,
      targetPrice: tow.targetPrice,
    });
  }

  return results;
}

function simulateOutcome(
  candles: CandleData[],
  signalIndex: number,
  entryPrice: number,
  stopLoss: number,
  targetPrice: number
): { outcome: "win" | "loss" | "timeout"; rMultiple: number; holdDays: number } {
  const risk = entryPrice - stopLoss;
  if (risk <= 0) return { outcome: "timeout", rMultiple: 0, holdDays: 0 };

  for (let h = 1; h <= MAX_HOLD_DAYS; h++) {
    const idx = signalIndex + h;
    if (idx >= candles.length) {
      // ran out of history — close at last known close
      const last = candles[candles.length - 1];
      const rMultiple = (last.close - entryPrice) / risk;
      return { outcome: "timeout", rMultiple, holdDays: h };
    }
    const day = candles[idx];
    const hitStop = day.low <= stopLoss;
    const hitTarget = day.high >= targetPrice;

    if (hitStop && hitTarget) {
      // Ambiguous same-day — conservative: stop assumed first
      return { outcome: "loss", rMultiple: -1, holdDays: h };
    }
    if (hitStop) {
      return { outcome: "loss", rMultiple: -1, holdDays: h };
    }
    if (hitTarget) {
      const rMultiple = (targetPrice - entryPrice) / risk;
      return { outcome: "win", rMultiple, holdDays: h };
    }
  }

  const closeIdx = Math.min(signalIndex + MAX_HOLD_DAYS, candles.length - 1);
  const closePrice = candles[closeIdx].close;
  const rMultiple = (closePrice - entryPrice) / risk;
  return { outcome: "timeout", rMultiple, holdDays: MAX_HOLD_DAYS };
}

async function backtestSymbol(symbol: string): Promise<SimTrade[]> {
  const candles = await getDailyHistory(symbol);
  if (candles.length < MIN_WARMUP_CANDLES + MAX_HOLD_DAYS) return [];

  const trades: SimTrade[] = [];
  const openUntil: Record<PatternName, number> = { Cupid: -1, RollerCoaster: -1, TugOfWar: -1 };

  const lastIndex = candles.length - 1 - MAX_HOLD_DAYS; // leave room to resolve the trade
  for (let i = MIN_WARMUP_CANDLES; i <= lastIndex; i++) {
    const slice = candles.slice(0, i + 1); // no lookahead: only data through day i
    const currentPrice = slice[slice.length - 1].close;
    const signals = detectAll(slice, symbol, symbol, currentPrice);

    for (const sig of signals) {
      if (i <= openUntil[sig.pattern]) continue; // still in an open trade for this pattern

      const result = simulateOutcome(candles, i, sig.entryPrice, sig.stopLoss, sig.targetPrice);
      trades.push({
        symbol,
        pattern: sig.pattern,
        signalDate: candles[i].date,
        confidence: sig.confidence,
        entryPrice: sig.entryPrice,
        stopLoss: sig.stopLoss,
        targetPrice: sig.targetPrice,
        outcome: result.outcome,
        rMultiple: result.rMultiple,
        holdDays: result.holdDays,
      });
      openUntil[sig.pattern] = i + result.holdDays;
    }
  }

  return trades;
}

function summarize(trades: SimTrade[], label: string) {
  if (trades.length === 0) {
    console.log(`\n${label}: no trades generated`);
    return;
  }
  const wins = trades.filter(t => t.outcome === "win");
  const losses = trades.filter(t => t.outcome === "loss");
  const timeouts = trades.filter(t => t.outcome === "timeout");
  const winRate = wins.length / trades.length;
  const avgR = trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length;
  const avgWinR = wins.length ? wins.reduce((s, t) => s + t.rMultiple, 0) / wins.length : 0;
  const avgLossR = losses.length ? losses.reduce((s, t) => s + t.rMultiple, 0) / losses.length : 0;
  const expectancy = winRate * avgWinR + (1 - winRate) * avgLossR;

  console.log(`\n${label} — ${trades.length} trades`);
  console.log(`  Win rate: ${(winRate * 100).toFixed(1)}%  (${wins.length}W / ${losses.length}L / ${timeouts.length} timeout)`);
  console.log(`  Avg R per trade: ${avgR.toFixed(2)}   Expectancy: ${expectancy.toFixed(2)}R`);
  console.log(`  Avg win: +${avgWinR.toFixed(2)}R   Avg loss: ${avgLossR.toFixed(2)}R`);

  // Confidence calibration: does a higher confidence score actually mean a higher win rate?
  const buckets: [number, number][] = [[40, 59], [60, 79], [80, 100]];
  console.log(`  Confidence calibration:`);
  for (const [lo, hi] of buckets) {
    const bucketTrades = trades.filter(t => t.confidence >= lo && t.confidence <= hi);
    if (bucketTrades.length === 0) {
      console.log(`    ${lo}-${hi}%: no trades`);
      continue;
    }
    const bucketWins = bucketTrades.filter(t => t.outcome === "win").length;
    const bucketWinRate = (bucketWins / bucketTrades.length) * 100;
    console.log(`    ${lo}-${hi}%: ${bucketTrades.length} trades, actual win rate ${bucketWinRate.toFixed(1)}%`);
  }
}

(async () => {
  console.log(`Backtesting ${UNIVERSE.length} symbols over ${HISTORY_YEARS} years of daily data...`);
  console.log(`(Max hold: ${MAX_HOLD_DAYS} trading days, min confidence: ${MIN_CONFIDENCE}%)\n`);

  const allTrades: SimTrade[] = [];
  for (const symbol of UNIVERSE) {
    process.stdout.write(`  ${symbol}...`);
    const trades = await backtestSymbol(symbol);
    console.log(` ${trades.length} signals`);
    allTrades.push(...trades);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULTS — ${allTrades.length} total trades across ${UNIVERSE.length} symbols`);
  console.log("=".repeat(60));

  summarize(allTrades, "ALL PATTERNS COMBINED");
  for (const pattern of ["Cupid", "RollerCoaster", "TugOfWar"] as PatternName[]) {
    summarize(allTrades.filter(t => t.pattern === pattern), pattern);
  }
})();
