import { useTrades, useStockQuote } from "@/hooks/use-stocks";
import { useQuery } from "@tanstack/react-query";
import { StockCard } from "@/components/stock-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, TrendingUp, Activity, DollarSign, List } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { data: trades, isLoading } = useTrades();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setLocation(`/analysis?symbol=${search.trim().toUpperCase()}`);
    }
  };

  const { data: recommendations } = useQuery<any[]>({
    queryKey: ["/api/sp500/recommendations"],
  });

  const { data: sp500Stocks } = useQuery<any[]>({
    queryKey: ["/api/sp500"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-card/50 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-card/50 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const activeTrades = trades?.filter(t => t.status === "EXECUTED") || [];
  const pendingTrades = trades?.filter(t => t.status === "PENDING_APPROVAL") || [];
  
  // Quick stats mock
  const totalPnL = activeTrades.reduce((acc, _) => acc + (Math.random() * 200 - 50), 0); // Mock PnL
  const winRate = activeTrades.length > 0 ? 65 : 0;

  return (
    <div className="space-y-8">
      {/* Welcome & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">
            Welcome back, <span className="text-primary">{user?.firstName || 'Trader'}</span>
          </h2>
          <p className="text-muted-foreground mt-1">Here's what's happening in your portfolio.</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search symbol (e.g. AAPL)..." 
              className="pl-10 bg-card/50 border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/50"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90">
            <Plus className="w-5 h-5" />
          </Button>
        </form>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-panel p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Net P&L</p>
              <h3 className={`text-2xl font-mono font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
              </h3>
            </div>
          </div>
        </Card>
        
        <Card className="glass-panel p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Active Positions</p>
              <h3 className="text-2xl font-mono font-bold text-foreground">{activeTrades.length}</h3>
            </div>
          </div>
        </Card>

        <Card className="glass-panel p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Win Rate</p>
              <h3 className="text-2xl font-mono font-bold text-foreground">{winRate}%</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Market Scanner Promo */}
          <Card className="glass-panel p-8 border-primary/20 bg-primary/5 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/20 transition-colors" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
                <Scan className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-display font-bold mb-2">Ready for today's top trade setups?</h3>
                <p className="text-muted-foreground text-sm max-w-lg">
                  Our AI scanner has analyzed the S&P 500 constituents to find high-probability setups with defined entry and exit levels.
                </p>
              </div>
              <Button onClick={() => setLocation("/scan")} size="lg" className="bg-primary hover:bg-primary/90 whitespace-nowrap">
                Go to Scanner
              </Button>
            </div>
          </Card>

          {/* Pending Approvals */}
          {pendingTrades.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Pending Approvals
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingTrades.map(trade => (
              <StockCard key={trade.id} trade={trade} />
            ))}
          </div>
        </div>
      )}

          {/* Active Trades */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-foreground">Active Trades</h3>
              <Link href="/history" className="text-sm text-primary hover:underline font-medium">View All</Link>
            </div>
            
            {activeTrades.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto flex items-center justify-center mb-4">
                  <Activity className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">No active trades</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                  Use the Market Analysis tool to find new trading opportunities powered by AI.
                </p>
                <Button onClick={() => setLocation("/analysis")} className="bg-primary hover:bg-primary/90">
                  Go to Analysis
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTrades.map(trade => (
                  <StockCard key={trade.id} trade={trade} compact />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Watchlist Sidebar */}
        <div className="space-y-6">
          <Card className="glass-panel h-full flex flex-col border-white/5">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <List className="w-5 h-5 text-primary" />
                S&P 500 Watchlist
              </h3>
              <div className="px-2 py-1 rounded bg-secondary text-[10px] font-bold text-muted-foreground">TOP 10</div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sp500Stocks?.map((stock) => (
                <div 
                  key={stock.symbol} 
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => setLocation(`/analysis?symbol=${stock.symbol}`)}
                >
                  <div>
                    <p className="font-mono font-bold text-sm group-hover:text-primary transition-colors">{stock.symbol}</p>
                    <p className="text-[10px] text-muted-foreground truncate w-32">{stock.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm">${Number(stock.lastPrice).toFixed(2)}</p>
                    <p className="text-[10px] text-green-500 font-bold">+1.24%</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
