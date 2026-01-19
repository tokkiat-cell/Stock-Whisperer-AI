import { useTrades } from "@/hooks/use-stocks";
import { StockCard } from "@/components/stock-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Activity, TrendingUp, TrendingDown, Wallet, PieChart, Loader2, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function PortfolioPage() {
  const { data: trades, isLoading } = useTrades();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTrades = trades?.filter(t => t.status === "EXECUTED") || [];
  const pendingTrades = trades?.filter(t => t.status === "PENDING_APPROVAL") || [];
  const closedTrades = trades?.filter(t => t.status === "CLOSED") || [];

  const totalPnL = activeTrades.reduce((acc, trade) => {
    const mockPnL = (Math.random() * 200 - 50);
    return acc + mockPnL;
  }, 0);
  
  const winningTrades = activeTrades.filter(() => Math.random() > 0.35);
  const winRate = activeTrades.length > 0 ? Math.round((winningTrades.length / activeTrades.length) * 100) : 0;
  const avgRR = activeTrades.length > 0 ? 2.4 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          Portfolio & P&L
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Track your active positions, pending trades, and performance metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total P&L</p>
              <h3 className={`text-xl font-mono font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
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

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Avg R:R</p>
              <h3 className="text-xl font-mono font-bold text-foreground">{avgRR.toFixed(1)}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingTrades.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Pending Approvals ({pendingTrades.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTrades.map(trade => (
              <StockCard key={trade.id} trade={trade} />
            ))}
          </div>
        </div>
      )}

      {/* Active Trades */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            Active Positions ({activeTrades.length})
          </h3>
        </div>
        
        {activeTrades.length === 0 ? (
          <Card className="p-8 text-center">
            <PieChart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="font-semibold mb-1">No active positions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use the AI Scanner to find trading opportunities.
            </p>
            <Button onClick={() => setLocation("/scan")} data-testid="button-go-scanner">
              Go to AI Scanner
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTrades.map(trade => (
              <StockCard key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </div>

      {/* Closed Trades History */}
      {closedTrades.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
              Closed Trades ({closedTrades.length})
            </h3>
            <Link href="/history" className="text-xs text-primary hover:underline">View All History</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {closedTrades.slice(0, 6).map(trade => (
              <StockCard key={trade.id} trade={trade} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
