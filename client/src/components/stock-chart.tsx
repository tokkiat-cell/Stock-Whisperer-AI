import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, CandlestickData, LineData, CandlestickSeries, LineSeries, HistogramSeries, HistogramData } from "lightweight-charts";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ChartInterval = "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1wk" | "1mo";

interface StockHistoryResponse {
  candles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
  movingAverages: {
    ma20: Array<{ time: number; value: number }>;
    ma40: Array<{ time: number; value: number }>;
    ma100: Array<{ time: number; value: number }>;
    ma200: Array<{ time: number; value: number }>;
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
}

interface ChartLevels {
  support?: number;
  resistance?: number;
  entry?: number;
  stopLoss?: number;
  target?: number;
}

interface OHLCData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
  change: number;
  changePercent: number;
}

interface StockChartProps {
  symbol: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levels?: ChartLevels;
}

const MA_COLORS = {
  ma20: "#22c55e",
  ma40: "#3b82f6",
  ma100: "#f59e0b",
  ma200: "#ef4444",
};

const INTERVALS: { value: ChartInterval; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1h", label: "1H" },
  { value: "1d", label: "1D" },
  { value: "1wk", label: "1W" },
  { value: "1mo", label: "1M" },
];

function formatNumber(num: number | undefined, decimals: number = 2): string {
  if (num === undefined || num === null) return "-";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatVolume(volume: number | undefined): string {
  if (volume === undefined || volume === null) return "-";
  if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(2)}B`;
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
  return volume.toString();
}

export function StockChart({ symbol, open, onOpenChange, levels }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  
  const [interval, setInterval] = useState<ChartInterval>("1d");
  const [visibleMAs, setVisibleMAs] = useState({
    ma20: true,
    ma40: true,
    ma100: true,
    ma200: true,
  });
  const [hoveredCandle, setHoveredCandle] = useState<OHLCData | null>(null);
  const [chartReady, setChartReady] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<StockHistoryResponse>({
    queryKey: ["/api/stocks", symbol, "history", interval],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${symbol}/history?interval=${interval}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    enabled: open && !!symbol,
  });

  // Store candle data for crosshair lookup
  const candleMapRef = useRef<Map<string, OHLCData>>(new Map());

  useEffect(() => {
    if (!open || !data) {
      setChartReady(false);
      return;
    }

    const container = chartContainerRef.current;
    if (!container) return;

    const checkReady = () => {
      if (container.clientWidth > 0) {
        setChartReady(true);
      } else {
        requestAnimationFrame(checkReady);
      }
    };

    requestAnimationFrame(checkReady);
  }, [open, data]);

  useEffect(() => {
    if (!chartReady || !chartContainerRef.current || !data) return;

    const container = chartContainerRef.current;
    if (container.clientWidth === 0) return;

    // Build candle map for crosshair
    candleMapRef.current.clear();
    data.candles.forEach((c, i) => {
      const prevClose = i > 0 ? data.candles[i - 1].close : c.open;
      const change = c.close - prevClose;
      const changePercent = (change / prevClose) * 100;
      candleMapRef.current.set(c.time.toString(), {
        ...c,
        volume: c.volume || 0,
        change,
        changePercent,
      });
    });

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a0a" },
        textColor: "#d4d4d4",
      },
      grid: {
        vertLines: { color: "#1f1f1f" },
        horzLines: { color: "#1f1f1f" },
      },
      width: container.clientWidth,
      height: 450,
      timeScale: {
        borderColor: "#333",
        timeVisible: true,
        secondsVisible: interval === "1m",
      },
      rightPriceScale: {
        borderColor: "#333",
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#555",
          width: 1,
          style: 2,
          labelBackgroundColor: "#333",
        },
        horzLine: {
          color: "#555",
          width: 1,
          style: 2,
          labelBackgroundColor: "#333",
        },
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    const candleData: CandlestickData[] = data.candles.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candlestickSeries.setData(candleData);

    // Add volume histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });

    chart.priceScale("").applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const volumeData: HistogramData[] = data.candles.map((c) => ({
      time: c.time as any,
      value: c.volume || 0,
      color: c.close >= c.open ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
    }));
    volumeSeries.setData(volumeData);

    // Add moving averages
    const maSeries: Record<string, ReturnType<typeof chart.addSeries>> = {};

    if (visibleMAs.ma20 && data.movingAverages.ma20.length > 0) {
      maSeries.ma20 = chart.addSeries(LineSeries, {
        color: MA_COLORS.ma20,
        lineWidth: 1,
        title: "MA20",
      });
      maSeries.ma20.setData(data.movingAverages.ma20 as LineData[]);
    }

    if (visibleMAs.ma40 && data.movingAverages.ma40.length > 0) {
      maSeries.ma40 = chart.addSeries(LineSeries, {
        color: MA_COLORS.ma40,
        lineWidth: 1,
        title: "MA40",
      });
      maSeries.ma40.setData(data.movingAverages.ma40 as LineData[]);
    }

    if (visibleMAs.ma100 && data.movingAverages.ma100.length > 0) {
      maSeries.ma100 = chart.addSeries(LineSeries, {
        color: MA_COLORS.ma100,
        lineWidth: 1,
        title: "MA100",
      });
      maSeries.ma100.setData(data.movingAverages.ma100 as LineData[]);
    }

    if (visibleMAs.ma200 && data.movingAverages.ma200.length > 0) {
      maSeries.ma200 = chart.addSeries(LineSeries, {
        color: MA_COLORS.ma200,
        lineWidth: 2,
        title: "MA200",
      });
      maSeries.ma200.setData(data.movingAverages.ma200 as LineData[]);
    }

    // Add price levels (entry, stop loss, target)
    if (levels && candleData.length > 0) {
      const firstTime = candleData[0].time;
      const lastTime = candleData[candleData.length - 1].time;

      const addPriceLine = (price: number, color: string, title: string, lineStyle: number = 0) => {
        const lineSeries = chart.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          lineStyle,
          title,
          lastValueVisible: true,
          priceLineVisible: false,
        });
        lineSeries.setData([
          { time: firstTime as any, value: price },
          { time: lastTime as any, value: price },
        ]);
      };

      if (levels.support) {
        addPriceLine(levels.support, "#3b82f6", "Support", 2);
      }
      if (levels.resistance) {
        addPriceLine(levels.resistance, "#ef4444", "Resistance", 2);
      }
      if (levels.entry) {
        addPriceLine(levels.entry, "#22c55e", "Entry", 0);
      }
      if (levels.stopLoss) {
        addPriceLine(levels.stopLoss, "#ef4444", "Stop", 0);
      }
      if (levels.target) {
        addPriceLine(levels.target, "#22c55e", "Target", 0);
      }
    }

    // Crosshair move handler for OHLC display
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        // Reset to latest candle when mouse leaves
        if (data.candles.length > 0) {
          const lastCandle = data.candles[data.candles.length - 1];
          const prevClose = data.candles.length > 1 ? data.candles[data.candles.length - 2].close : lastCandle.open;
          setHoveredCandle({
            ...lastCandle,
            volume: lastCandle.volume || 0,
            change: lastCandle.close - prevClose,
            changePercent: ((lastCandle.close - prevClose) / prevClose) * 100,
          });
        }
        return;
      }
      const candleInfo = candleMapRef.current.get(param.time.toString());
      if (candleInfo) {
        setHoveredCandle(candleInfo);
      }
    });

    // Set initial hovered candle to latest
    if (data.candles.length > 0) {
      const lastCandle = data.candles[data.candles.length - 1];
      const prevClose = data.candles.length > 1 ? data.candles[data.candles.length - 2].close : lastCandle.open;
      setHoveredCandle({
        ...lastCandle,
        volume: lastCandle.volume || 0,
        change: lastCandle.close - prevClose,
        changePercent: ((lastCandle.close - prevClose) / prevClose) * 100,
      });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [chartReady, data, visibleMAs, levels, interval]);

  const toggleMA = (ma: keyof typeof visibleMAs) => {
    setVisibleMAs((prev) => ({ ...prev, [ma]: !prev[ma] }));
  };

  const handleIntervalChange = (newInterval: ChartInterval) => {
    setInterval(newInterval);
  };

  const isPositive = hoveredCandle ? hoveredCandle.change >= 0 : true;
  const quote = data?.quote;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-[#0a0a0a] border-[#333]">
        <DialogHeader className="border-b border-[#333] pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl text-white">{symbol}</DialogTitle>
              {quote?.regularMarketPrice && (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-white">
                    ${formatNumber(quote.regularMarketPrice)}
                  </span>
                  <span className={cn("text-sm flex items-center gap-1", quote.regularMarketChange && quote.regularMarketChange >= 0 ? "text-green-500" : "text-red-500")}>
                    {quote.regularMarketChange && quote.regularMarketChange >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {formatNumber(quote.regularMarketChange)} ({formatNumber(quote.regularMarketChangePercent)}%)
                  </span>
                </div>
              )}
            </div>
            <DialogDescription className="sr-only">Stock chart with OHLC data</DialogDescription>
          </div>

          {/* Bid/Ask Display */}
          {(quote?.bid || quote?.ask) && (
            <div className="flex items-center gap-4 text-sm mt-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Bid:</span>
                <span className="text-green-500 font-medium">
                  ${formatNumber(quote.bid)} {quote.bidSize && <span className="text-muted-foreground">x{quote.bidSize}</span>}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Ask:</span>
                <span className="text-red-500 font-medium">
                  ${formatNumber(quote.ask)} {quote.askSize && <span className="text-muted-foreground">x{quote.askSize}</span>}
                </span>
              </div>
              {quote.bid && quote.ask && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Spread:</span>
                  <span className="text-white font-medium">${formatNumber(quote.ask - quote.bid)}</span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 flex-wrap">
          {INTERVALS.map((int) => (
            <Button
              key={int.value}
              variant={interval === int.value ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-3 text-xs",
                interval === int.value ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-white"
              )}
              onClick={() => handleIntervalChange(int.value)}
              data-testid={`timeframe-${int.value}`}
            >
              {int.label}
            </Button>
          ))}
          <div className="flex-1" />
          {/* MA Toggles */}
          <div className="flex items-center gap-1">
            <Button
              variant={visibleMAs.ma20 ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => toggleMA("ma20")}
              style={{ backgroundColor: visibleMAs.ma20 ? MA_COLORS.ma20 : undefined }}
              data-testid="toggle-ma20"
            >
              MA20
            </Button>
            <Button
              variant={visibleMAs.ma40 ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => toggleMA("ma40")}
              style={{ backgroundColor: visibleMAs.ma40 ? MA_COLORS.ma40 : undefined }}
              data-testid="toggle-ma40"
            >
              MA40
            </Button>
            <Button
              variant={visibleMAs.ma100 ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => toggleMA("ma100")}
              style={{ backgroundColor: visibleMAs.ma100 ? MA_COLORS.ma100 : undefined }}
              data-testid="toggle-ma100"
            >
              MA100
            </Button>
            <Button
              variant={visibleMAs.ma200 ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => toggleMA("ma200")}
              style={{ backgroundColor: visibleMAs.ma200 ? MA_COLORS.ma200 : undefined }}
              data-testid="toggle-ma200"
            >
              MA200
            </Button>
          </div>
        </div>

        {/* OHLC Info Bar */}
        {hoveredCandle && (
          <div className="flex items-center gap-4 text-sm bg-[#111] p-2 rounded border border-[#333]">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">O:</span>
              <span className="text-white font-mono">{formatNumber(hoveredCandle.open)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">H:</span>
              <span className="text-white font-mono">{formatNumber(hoveredCandle.high)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">L:</span>
              <span className="text-white font-mono">{formatNumber(hoveredCandle.low)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">C:</span>
              <span className={cn("font-mono", isPositive ? "text-green-500" : "text-red-500")}>
                {formatNumber(hoveredCandle.close)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Chg:</span>
              <span className={cn("font-mono", isPositive ? "text-green-500" : "text-red-500")}>
                {isPositive ? "+" : ""}{formatNumber(hoveredCandle.change)} ({isPositive ? "+" : ""}{formatNumber(hoveredCandle.changePercent)}%)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Vol:</span>
              <span className="text-white font-mono">{formatVolume(hoveredCandle.volume)}</span>
            </div>
          </div>
        )}

        {/* Chart Container */}
        {isLoading ? (
          <div className="flex items-center justify-center h-[450px] bg-[#0a0a0a]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[450px] text-muted-foreground bg-[#0a0a0a]">
            Failed to load chart data
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-[450px] relative" data-testid="chart-container" />
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-[#333] flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: MA_COLORS.ma20 }} />
            <span>20-day MA</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: MA_COLORS.ma40 }} />
            <span>40-day MA</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: MA_COLORS.ma100 }} />
            <span>100-day MA</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: MA_COLORS.ma200 }} />
            <span>200-day MA</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-1 bg-green-500/50" />
            <span>Buy Volume</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-1 bg-red-500/50" />
            <span>Sell Volume</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
