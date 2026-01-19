import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, LineData, CandlestickSeries, LineSeries } from "lightweight-charts";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

interface StockChartProps {
  symbol: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MA_COLORS = {
  ma20: "#22c55e",
  ma40: "#3b82f6",
  ma100: "#f59e0b",
  ma200: "#ef4444",
};

export function StockChart({ symbol, open, onOpenChange }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [visibleMAs, setVisibleMAs] = useState({
    ma20: true,
    ma40: true,
    ma100: true,
    ma200: true,
  });

  const { data, isLoading, error } = useQuery<StockHistoryResponse>({
    queryKey: ["/api/stocks", symbol, "history"],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${symbol}/history`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    enabled: open && !!symbol,
  });

  useEffect(() => {
    if (!open || !chartContainerRef.current || !data) return;

    const container = chartContainerRef.current;
    
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
      height: 400,
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

    const maSeries: Record<string, ISeriesApi<typeof LineSeries>> = {};

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
  }, [open, data, visibleMAs]);

  const toggleMA = (ma: keyof typeof visibleMAs) => {
    setVisibleMAs((prev) => ({ ...prev, [ma]: !prev[ma] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{symbol} - Candlestick Chart</DialogTitle>
          <DialogDescription>
            Daily price chart with moving averages (20, 40, 100, 200 days)
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-wrap gap-2 mb-4">
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
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            Failed to load chart data
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-[400px] relative" data-testid="chart-container" />
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
