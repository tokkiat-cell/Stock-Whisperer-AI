import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, TrendingUp, TrendingDown, Activity, Loader2, Sparkles, Scan, LineChart, Crown, Zap, ArrowRight, PieChart, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { StockChart } from "@/components/stock-chart";
import { MarketOverview } from "@/components/market-overview";
import type { PortfolioHolding, StockQuote } from "@shared/schema";
import { useEffect } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const [chartOpen, setChartOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("");
  const [quotes, setQuotes] = useState<Record<string, number>>({});

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

  const { data: recommendations } = useQuery<any[]>({
    queryKey: ["/api/sp500/recommendations"],
  });

  const { data: usageData } = useQuery<{ planTier: string }>({
    queryKey: ['/api/usage'],
  });

  const { data: holdings = [] } = useQuery<PortfolioHolding[]>({
    queryKey: ['/api/portfolio'],
  });

  useEffect(() => {
    if (holdings.length > 0) {
      const fetchQuotes = async () => {
        const newQuotes: Record<string, number> = {};
        for (const h of holdings.slice(0, 10)) {
          try {
            const res = await fetch(`/api/stocks/quote/${h.symbol}`);
            if (res.ok) {
              const data = await res.json();
              newQuotes[h.symbol] = data.price;
            }
          } catch (e) {}
        }
        setQuotes(newQuotes);
      };
      fetchQuotes();
    }
  }, [holdings]);

  const totalCost = holdings.reduce((acc, h) => acc + (parseFloat(h.shares as string) * parseFloat(h.avgCost as string)), 0);
  const totalMarketValue = holdings.reduce((acc, h) => {
    const price = quotes[h.symbol] || parseFloat(h.avgCost as string);
    return acc + (parseFloat(h.shares as string) * price);
  }, 0);
  const totalPnL = totalMarketValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  const holdingsCount = holdings.length;
  const hasQuotes = Object.keys(quotes).length > 0;

  const planTier = usageData?.planTier || 'free';
  
  const getPlanInfo = () => {
    if (planTier === 'pro') return { name: 'Pro', icon: Crown, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
    if (planTier === 'basic') return { name: 'Basic', icon: Zap, color: 'text-primary', bgColor: 'bg-primary/10' };
    if (planTier === 'subscriber') return { name: 'Subscriber', icon: Crown, color: 'text-primary', bgColor: 'bg-primary/10' };
    return { name: 'Free', icon: Sparkles, color: 'text-muted-foreground', bgColor: 'bg-muted' };
  };

  const planInfo = getPlanInfo();

  return (
    <div className="space-y-6">
      {/* Welcome & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-semibold text-foreground">
              Welcome back, <span className="text-primary">{user?.firstName || 'Trader'}</span>
            </h2>
            <Badge 
              variant={planTier === 'free' ? 'secondary' : 'default'}
              className={planTier === 'pro' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : planTier === 'basic' ? 'bg-primary/20 text-primary border-primary/30' : ''}
              data-testid="badge-dashboard-plan"
            >
              <planInfo.icon className={`w-3 h-3 mr-1 ${planInfo.color}`} />
              {planInfo.name} Plan
            </Badge>
          </div>
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

        {/* Portfolio Summary */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <PieChart className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Portfolio & P&L</h3>
              {holdingsCount > 0 ? (
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">{holdingsCount} stocks</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Value: </span>
                    <span className="font-mono font-semibold">${totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {hasQuotes && (
                    <div className={`text-sm font-mono font-semibold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({totalPnLPercent.toFixed(2)}%)
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No holdings yet - Add stocks to track P&L</p>
              )}
            </div>
            <Button onClick={() => setLocation("/portfolio")} variant="outline" data-testid="button-go-portfolio">
              <DollarSign className="w-4 h-4 mr-2" />
              View P&L
            </Button>
          </div>
        </Card>
      </div>

      {/* Premarket Changes CTA */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Activity className="w-7 h-7 text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Premarket Changes</h3>
            <p className="text-sm text-muted-foreground">View top 20 daily gainers and losers by % change</p>
          </div>
          <Button onClick={() => setLocation("/premarket")} variant="outline" data-testid="button-go-premarket">
            <TrendingUp className="w-4 h-4 mr-2" />
            View Changes
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>

      <StockChart
        symbol={chartSymbol}
        open={chartOpen}
        onOpenChange={setChartOpen}
      />
    </div>
  );
}
