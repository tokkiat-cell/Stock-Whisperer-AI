import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight, Loader2, Sparkles, MessageCircle, Scan, LineChart, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { StockChart } from "@/components/stock-chart";
import { MarketOverview } from "@/components/market-overview";

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const [chartOpen, setChartOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const openChart = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChartSymbol(symbol);
    setChartOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setLocation(`/analysis?symbol=${search.trim().toUpperCase()}`);
    }
  };

  const handleRefreshMovers = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/market/premarket-movers"] });
    } finally {
      setIsRefreshing(false);
    }
  };

  const { data: premarketMovers, isLoading: moversLoading } = useQuery<any[]>({
    queryKey: ["/api/market/premarket-movers"],
  });

  const { data: recommendations } = useQuery<any[]>({
    queryKey: ["/api/sp500/recommendations"],
  });

  return (
    <div className="space-y-6">
      {/* Welcome & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Welcome back, <span className="text-primary">{user?.firstName || 'Trader'}</span>
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Today's top market movers at a glance.</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search symbol (e.g. AAPL)..." 
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-symbol"
            />
          </div>
          <Button type="submit" data-testid="button-search-submit">
            <Search className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Market Overview - US and Singapore indices */}
      <MarketOverview />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Scanner CTA */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scan className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">AI Market Scanner</h3>
              <p className="text-sm text-muted-foreground">Get personalized trade recommendations</p>
            </div>
            <Button onClick={() => setLocation("/scan")} data-testid="button-go-scanner">
              <Sparkles className="w-4 h-4 mr-2" />
              Scan Now
            </Button>
          </div>
          {recommendations && recommendations.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Latest recommendations:</p>
              <div className="flex flex-wrap gap-2">
                {recommendations.slice(0, 5).map((rec, idx) => (
                  <span 
                    key={idx} 
                    className={`text-xs font-mono font-bold px-2 py-1 rounded ${rec.recommendation === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                  >
                    {rec.symbol}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* TradeMind AI CTA */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">TradeMind AI</h3>
              <p className="text-sm text-muted-foreground">Ask questions about stocks & strategies</p>
            </div>
            <Button onClick={() => setLocation("/chat")} variant="outline" data-testid="button-go-chat">
              <MessageCircle className="w-4 h-4 mr-2" />
              Open Chat
            </Button>
          </div>
        </Card>
      </div>

      {/* Top 10 Market Movers */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Top 10 Market Movers
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Highest % change today</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshMovers}
              disabled={isRefreshing || moversLoading}
              data-testid="button-refresh-movers"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        {moversLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {premarketMovers?.slice(0, 10).map((stock, idx) => (
              <div 
                key={stock.symbol} 
                className="relative p-4 rounded-xl bg-secondary/50 hover-elevate cursor-pointer transition-all"
                onClick={() => setLocation(`/analysis?symbol=${stock.symbol}`)}
                data-testid={`card-mover-${stock.symbol}`}
              >
                <div className="absolute top-2 left-2 text-xs font-bold text-muted-foreground/50">
                  #{idx + 1}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={(e) => openChart(stock.symbol, e)}
                  data-testid={`button-chart-${stock.symbol}`}
                >
                  <LineChart className="w-4 h-4" />
                </Button>
                <div className="flex flex-col items-center text-center pt-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${stock.changePercent >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {stock.changePercent >= 0 ? (
                      <ArrowUpRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <span className="font-mono font-bold text-lg">{stock.symbol}</span>
                  <p className="text-xs text-muted-foreground truncate w-full mt-1">{stock.name}</p>
                  <div className="mt-2 space-y-1">
                    <p className="font-mono text-sm">${stock.price.toFixed(2)}</p>
                    <span className={`text-sm font-bold ${stock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <StockChart
        symbol={chartSymbol}
        open={chartOpen}
        onOpenChange={setChartOpen}
      />
    </div>
  );
}
