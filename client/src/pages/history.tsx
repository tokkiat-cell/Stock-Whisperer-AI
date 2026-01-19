import { useTrades } from "@/hooks/use-stocks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TradeHistory() {
  const { data: trades, isLoading } = useTrades();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const sortedTrades = [...(trades || [])].sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold">Trade History</h2>
        <p className="text-muted-foreground mt-1">A log of all your executed and rejected trades.</p>
      </div>

      <Card className="glass-panel overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Date</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Symbol</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Direction</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Status</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Entry</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Target</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Stop</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTrades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No trade history found.
                </TableCell>
              </TableRow>
            ) : (
              sortedTrades.map((trade) => (
                <TableRow key={trade.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {format(new Date(trade.createdAt || new Date()), "yyyy-MM-dd HH:mm")}
                  </TableCell>
                  <TableCell className="font-bold">{trade.symbol}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={trade.direction === "LONG" ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"}>
                      {trade.direction}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <Badge variant="outline" className={`
                        border-transparent
                        ${trade.status === 'EXECUTED' ? 'bg-green-500/20 text-green-400' : ''}
                        ${trade.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' : ''}
                        ${trade.status === 'PENDING_APPROVAL' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                     `}>
                       {trade.status.replace("_", " ")}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">${Number(trade.entryPrice).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-green-500">${Number(trade.takeProfit).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-red-500">${Number(trade.stopLoss).toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
