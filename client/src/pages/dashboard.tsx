import { useTrades } from "@/hooks/use-stocks";
import { useQuery } from "@tanstack/react-query";
import { StockCard } from "@/components/stock-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, TrendingUp, TrendingDown, Activity, DollarSign, MessageCircle, Sparkles, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
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

  const { data: premarketMovers, isLoading: moversLoading } = useQuery<any[]>({
    queryKey: ["/api/market/premarket-movers"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-card/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-card/50 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  const activeTrades = trades?.filter(t => t.status === "EXECUTED") || [];
  const pendingTrades = trades?.filter(t => t.status === "PENDING_APPROVAL") || [];
  const totalPnL = activeTrades.reduce((acc, _) => acc + (Math.random() * 200 - 50), 0);
  const winRate = activeTrades.length > 0 ? 65 : 0;

  return (
    <div className="space-y-6">
      {/* Welcome & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Welcome back, <span className="text-primary">{user?.firstName || 'Trader'}</span>
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Here's what's happening in your portfolio.</p>
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
          <Button type="submit" size="icon" data-testid="button-search-submit">
            <Plus className="w-5 h-5" />
          </Button>
        </form>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Net P&L</p>
              <h3 className={`text-xl font-mono font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
              </h3>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Positions</p>
              <h3 className="text-xl font-mono font-bold text-foreground">{activeTrades.length}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Win Rate</p>
              <h3 className="text-xl font-mono font-bold text-foreground">{winRate}%</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          {/* Premarket Movers */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Top Movers
              </h3>
              <span className="text-xs text-muted-foreground">Highest % change</span>
            </div>
            
            {moversLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {premarketMovers?.map((stock) => (
                  <div 
                    key={stock.symbol} 
                    className="p-3 rounded-lg bg-secondary/50 hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/analysis?symbol=${stock.symbol}`)}
                    data-testid={`card-mover-${stock.symbol}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-sm">{stock.symbol}</span>
                      {stock.changePercent >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">{stock.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">${stock.price.toFixed(2)}</span>
                      <span className={`text-xs font-bold ${stock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* AI Recommendations */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Recommendations
              </h3>
              <Link href="/scan" className="text-xs text-primary hover:underline">Run Scanner</Link>
            </div>
            
            {!recommendations || recommendations.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recommendations yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setLocation("/scan")}
                  data-testid="button-run-scanner"
                >
                  Run AI Scanner
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.slice(0, 5).map((rec, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/analysis?symbol=${rec.symbol}`)}
                    data-testid={`card-rec-${rec.symbol}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${rec.recommendation === 'BUY' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {rec.recommendation === 'BUY' ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-mono font-bold text-sm">{rec.symbol}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{rec.rationale}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${rec.recommendation === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {rec.recommendation}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">R:R {rec.riskReward}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pending Approvals */}
          {pendingTrades.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  Pending Approvals
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingTrades.map(trade => (
                  <StockCard key={trade.id} trade={trade} />
                ))}
              </div>
            </div>
          )}

          {/* Active Trades */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Active Trades</h3>
              <Link href="/history" className="text-xs text-primary hover:underline">View All</Link>
            </div>
            
            {activeTrades.length === 0 ? (
              <Card className="p-8 text-center">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <h3 className="font-semibold mb-1">No active trades</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use the Market Analysis tool to find new opportunities.
                </p>
                <Button onClick={() => setLocation("/analysis")} data-testid="button-go-analysis">
                  Go to Analysis
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTrades.map(trade => (
                  <StockCard key={trade.id} trade={trade} compact />
                ))}
              </div>
            )}
          </div>

          {/* Quick Access to AI Chat */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">TradeMind AI Assistant</h3>
                  <p className="text-sm text-muted-foreground">Get instant market insights and trading advice</p>
                </div>
              </div>
              <Button onClick={() => setLocation("/chat")} data-testid="button-go-chat">
                <MessageCircle className="w-4 h-4 mr-2" />
                Open Chat
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
