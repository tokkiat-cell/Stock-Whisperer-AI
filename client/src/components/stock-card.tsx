import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { TradeSetup } from "@shared/schema";
import { useUpdateTradeStatus } from "@/hooks/use-stocks";
import { useToast } from "@/hooks/use-toast";

interface StockCardProps {
  trade: TradeSetup;
  compact?: boolean;
}

export function StockCard({ trade, compact = false }: StockCardProps) {
  const isLong = trade.direction === "LONG";
  const isProfit = true; // In a real app we'd compare current price to entry
  const updateStatus = useUpdateTradeStatus();
  const { toast } = useToast();

  const handleAction = (status: "EXECUTED" | "REJECTED") => {
    updateStatus.mutate({ id: trade.id, status }, {
      onSuccess: () => {
        toast({
          title: `Trade ${status === "EXECUTED" ? "Executed" : "Rejected"}`,
          description: `Order for ${trade.symbol} has been processed.`,
        });
      }
    });
  };

  const statusColors = {
    PENDING_APPROVAL: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    EXECUTED: "bg-green-500/10 text-green-500 border-green-500/20",
    REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <Card className="glass-panel overflow-hidden group hover:border-white/10 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isLong ? "bg-green-500/10" : "bg-red-500/10"
            )}>
              {isLong ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg">{trade.symbol}</h3>
                <Badge variant="outline" className={cn("text-xs font-mono uppercase", statusColors[trade.status as keyof typeof statusColors])}>
                  {trade.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {format(new Date(trade.createdAt || new Date()), "MMM dd, yyyy • HH:mm")}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-bold tracking-wider",
              isLong ? "bg-green-500 text-white" : "bg-red-500 text-white"
            )}>
              {trade.direction}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/5">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Entry</p>
            <p className="font-mono font-medium text-foreground">${Number(trade.entryPrice).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Target</p>
            <p className="font-mono font-medium text-green-500">${Number(trade.takeProfit).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Stop</p>
            <p className="font-mono font-medium text-red-500">${Number(trade.stopLoss).toFixed(2)}</p>
          </div>
        </div>

        {!compact && trade.rationale && (
          <div className="mt-4 bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              <span className="font-semibold text-primary/80 mr-1">AI Rationale:</span>
              {trade.rationale}
            </p>
          </div>
        )}

        {trade.status === "PENDING_APPROVAL" && (
          <div className="mt-5 flex items-center gap-2 pt-1">
            <Button 
              className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2 h-9 text-xs font-semibold"
              onClick={() => handleAction("EXECUTED")}
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-white/10 hover:bg-red-500/10 hover:text-red-500 gap-2 h-9 text-xs font-semibold"
              onClick={() => handleAction("REJECTED")}
              disabled={updateStatus.isPending}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
