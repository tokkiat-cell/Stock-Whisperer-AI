import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, CandlestickData, LineData, CandlestickSeries, LineSeries } from "lightweight-charts";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
}

interface AnalysisChartProps {
  symbol: string;
}

const MA_COLORS = {
  ma20: "#22c55e",
  ma40: "#3b82f6",
  ma100: "#f59e0b",
  ma200: "#ef4444",
};

function findSwingPoints(candles: StockHistoryResponse['candles']) {
  const swingHighs: Array<{ time: number; price: number; index: number }> = [];
  const swingLows: Array<{ time: number; price: number; index: number }> = [];
  
  if (candles.length < 5) return { swingHighs, swingLows };
  
  for (let i = 2; i < candles.length - 2; i++) {
    const prev2 = candles[i - 2];
    const prev1 = candles[i - 1];
    const current = candles[i];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];
    
    if (current.high > prev1.high && current.high > prev2.high &&
        current.high > next1.high && current.high > next2.high) {
      swingHighs.push({ time: current.time, price: current.high, index: i });
    }
    
    if (current.low < prev1.low && current.low < prev2.low &&
        current.low < next1.low && current.low < next2.low) {
      swingLows.push({ time: current.time, price: current.low, index: i });
    }
  }
  
  return { swingHighs, swingLows };
}

function findSupportResistance(candles: StockHistoryResponse['candles']) {
  if (candles.length < 20) return { support: null, resistance: null };
  
  const recentCandles = candles.slice(-60);
  const highs = recentCandles.map(c => c.high);
  const lows = recentCandles.map(c => c.low);
  
  const sortedHighs = [...highs].sort((a, b) => b - a);
  const sortedLows = [...lows].sort((a, b) => a - b);
  
  const resistance = sortedHighs[Math.floor(sortedHighs.length * 0.1)] || sortedHighs[0];
  const support = sortedLows[Math.floor(sortedLows.length * 0.1)] || sortedLows[0];
  
  return { support, resistance };
}

export function AnalysisChart({ symbol }: AnalysisChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [visibleMAs, setVisibleMAs] = useState({
    ma20: true,
    ma40: false,
    ma100: false,
    ma200: true,
  });
  const [showTrendlines, setShowTrendlines] = useState(true);
  const [showSR, setShowSR] = useState(true);

  const { data, isLoading, error } = useQuery<StockHistoryResponse>({
    queryKey: ["/api/stocks", symbol, "history"],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${symbol}/history`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    enabled: !!symbol,
  });

  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    if (!data) {
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
  }, [data]);

  useEffect(() => {
    if (!chartReady || !chartContainerRef.current || !data) return;

    const container = chartContainerRef.current;
    if (container.clientWidth === 0) return;
    
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "hsl(var(--foreground))",
      },
      grid: {
        vertLines: { color: "hsl(var(--muted) / 0.3)" },
        horzLines: { color: "hsl(var(--muted) / 0.3)" },
      },
      width: container.clientWidth,
      height: 500,
      timeScale: {
        borderColor: "hsl(var(--border))",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "hsl(var(--border))",
      },
      crosshair: {
        mode: 1,
      },
    });
    
    chartRef.current = chart;

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

    if (visibleMAs.ma20 && data.movingAverages.ma20.length > 0) {
      const series = chart.addSeries(LineSeries, {
        color: MA_COLORS.ma20,
        lineWidth: 1,
        title: "MA20",
      });
      series.setData(data.movingAverages.ma20 as LineData[]);
    }

    if (visibleMAs.ma40 && data.movingAverages.ma40.length > 0) {
      const series = chart.addSeries(LineSeries, {
        color: MA_COLORS.ma40,
        lineWidth: 1,
        title: "MA40",
      });
      series.setData(data.movingAverages.ma40 as LineData[]);
    }

    if (visibleMAs.ma100 && data.movingAverages.ma100.length > 0) {
      const series = chart.addSeries(LineSeries, {
        color: MA_COLORS.ma100,
        lineWidth: 1,
        title: "MA100",
      });
      series.setData(data.movingAverages.ma100 as LineData[]);
    }

    if (visibleMAs.ma200 && data.movingAverages.ma200.length > 0) {
      const series = chart.addSeries(LineSeries, {
        color: MA_COLORS.ma200,
        lineWidth: 2,
        title: "MA200",
      });
      series.setData(data.movingAverages.ma200 as LineData[]);
    }

    if (candleData.length > 0) {
      const firstTime = candleData[0].time;
      const lastTime = candleData[candleData.length - 1].time;
      
      if (showSR) {
        const { support, resistance } = findSupportResistance(data.candles);
        
        if (support) {
          const supportLine = chart.addSeries(LineSeries, {
            color: '#3b82f6',
            lineWidth: 2,
            lineStyle: 2,
            title: 'Support',
            lastValueVisible: true,
            priceLineVisible: false,
          });
          supportLine.setData([
            { time: firstTime as any, value: support },
            { time: lastTime as any, value: support }
          ]);
        }
        
        if (resistance) {
          const resistanceLine = chart.addSeries(LineSeries, {
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: 2,
            title: 'Resistance',
            lastValueVisible: true,
            priceLineVisible: false,
          });
          resistanceLine.setData([
            { time: firstTime as any, value: resistance },
            { time: lastTime as any, value: resistance }
          ]);
        }
      }
      
      if (showTrendlines) {
        const { swingHighs, swingLows } = findSwingPoints(data.candles);
        
        if (swingHighs.length >= 2) {
          const recentHighs = swingHighs.slice(-3);
          if (recentHighs.length >= 2) {
            const trendlineHigh = chart.addSeries(LineSeries, {
              color: '#f97316',
              lineWidth: 2,
              lineStyle: 0,
              title: 'Trend (High)',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            trendlineHigh.setData(recentHighs.map(h => ({
              time: h.time as any,
              value: h.price
            })));
          }
        }
        
        if (swingLows.length >= 2) {
          const recentLows = swingLows.slice(-3);
          if (recentLows.length >= 2) {
            const trendlineLow = chart.addSeries(LineSeries, {
              color: '#06b6d4',
              lineWidth: 2,
              lineStyle: 0,
              title: 'Trend (Low)',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            trendlineLow.setData(recentLows.map(l => ({
              time: l.time as any,
              value: l.price
            })));
          }
        }
      }
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
  }, [chartReady, data, visibleMAs, showTrendlines, showSR]);

  const toggleMA = (ma: keyof typeof visibleMAs) => {
    setVisibleMAs((prev) => ({ ...prev, [ma]: !prev[ma] }));
  };

  if (!symbol) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Enter a symbol above to view the chart
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground mr-2">MAs:</span>
        <Button
          variant={visibleMAs.ma20 ? "default" : "outline"}
          size="sm"
          onClick={() => toggleMA("ma20")}
          style={{ backgroundColor: visibleMAs.ma20 ? MA_COLORS.ma20 : undefined }}
          data-testid="toggle-ma20"
        >
          MA 20
        </Button>
        <Button
          variant={visibleMAs.ma40 ? "default" : "outline"}
          size="sm"
          onClick={() => toggleMA("ma40")}
          style={{ backgroundColor: visibleMAs.ma40 ? MA_COLORS.ma40 : undefined }}
          data-testid="toggle-ma40"
        >
          MA 40
        </Button>
        <Button
          variant={visibleMAs.ma100 ? "default" : "outline"}
          size="sm"
          onClick={() => toggleMA("ma100")}
          style={{ backgroundColor: visibleMAs.ma100 ? MA_COLORS.ma100 : undefined }}
          data-testid="toggle-ma100"
        >
          MA 100
        </Button>
        <Button
          variant={visibleMAs.ma200 ? "default" : "outline"}
          size="sm"
          onClick={() => toggleMA("ma200")}
          style={{ backgroundColor: visibleMAs.ma200 ? MA_COLORS.ma200 : undefined }}
          data-testid="toggle-ma200"
        >
          MA 200
        </Button>
        
        <div className="border-l pl-2 ml-2 flex gap-2">
          <Button
            variant={showTrendlines ? "default" : "outline"}
            size="sm"
            onClick={() => setShowTrendlines(!showTrendlines)}
            className={showTrendlines ? "bg-orange-500 hover:bg-orange-600" : ""}
            data-testid="toggle-trendlines"
          >
            Trendlines
          </Button>
          <Button
            variant={showSR ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSR(!showSR)}
            className={showSR ? "bg-purple-500 hover:bg-purple-600" : ""}
            data-testid="toggle-sr"
          >
            S/R Levels
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[500px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-[500px] text-muted-foreground">
          Failed to load chart data for {symbol}
        </div>
      ) : (
        <div ref={chartContainerRef} className="w-full h-[500px] relative" data-testid="analysis-chart-container" />
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-4 border-t mt-4">
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
        <div className="border-l pl-4 flex gap-4">
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-orange-500" />
            <span>Trendline (Highs)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-cyan-500" />
            <span>Trendline (Lows)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-500" style={{ borderStyle: 'dashed' }} />
            <span>Resistance</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500" style={{ borderStyle: 'dashed' }} />
            <span>Support</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
