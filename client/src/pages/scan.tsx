import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Scan, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldAlert, 
  Scale, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Recommendation {
  id: number;
  symbol: string;
  recommendation: "BUY" | "SELL";
  entryPrice: string;
  takeProfit: string;
  stopLoss: string;
  riskReward: string;
  rationale: string;
}

export default function MarketScan() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: recommendations, isLoading } = useQuery<Recommendation[]>({
    queryKey: ["/api/sp500/recommendations"],
  });

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await apiRequest("POST", "/api/sp500/scan", {});
      queryClient.invalidateQueries({ queryKey: ["/api/sp500/recommendations"] });
      toast({
        title: "Scan Complete",
        description: "Generated 5 high-probability trade setups for today.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: "Could not complete market scan. Please try again.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">AI Market Scanner</h2>
          <p className="text-muted-foreground mt-1">Daily high-probability trade setups from the S&P 500.</p>
        </div>
        <Button 
          onClick={handleScan} 
          disabled={isScanning}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          {isScanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning Market...
            </>
          ) : (
            <>
              <Scan className="mr-2 h-4 w-4" />
              Generate Today's Setups
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-card/50 rounded-2xl animate-pulse" />)}
        </div>
      ) : recommendations && recommendations.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="glass-panel overflow-hidden border-white/5">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner",
                      rec.recommendation === "BUY" ? "bg-green-500/10" : "bg-red-500/10"
                    )}>
                      {rec.recommendation === "BUY" ? (
                        <TrendingUp className="w-6 h-6 text-green-500" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-red-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-display">{rec.symbol}</h3>
                      <div className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full inline-block",
                        rec.recommendation === "BUY" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                      )}>
                        {rec.recommendation}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Entry
                      </p>
                      <p className="text-lg font-mono font-bold">${rec.entryPrice}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Target className="w-3 h-3" /> Target
                      </p>
                      <p className="text-lg font-mono font-bold text-green-500">${rec.takeProfit}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Stop Loss
                      </p>
                      <p className="text-lg font-mono font-bold text-red-500">${rec.stopLoss}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Scale className="w-3 h-3" /> R/R Ratio
                      </p>
                      <p className="text-lg font-mono font-bold text-primary">{rec.riskReward}</p>
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                    className="self-end md:self-center"
                  >
                    {expandedId === rec.id ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </div>

                {expandedId === rec.id && (
                  <div className="mt-6 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                    <h4 className="font-bold mb-3 flex items-center gap-2 text-sm text-foreground">
                      <Activity className="w-4 h-4 text-primary" />
                      AI Analysis & Rationale
                    </h4>
                    <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed">
                      {rec.rationale}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-panel p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto flex items-center justify-center mb-4">
            <Scan className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">No active setups</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            Our AI hasn't scanned the market for today yet. Start a scan to generate the latest high-probability setups.
          </p>
          <Button onClick={handleScan} className="bg-primary hover:bg-primary/90">
            Start Market Scan
          </Button>
        </Card>
      )}

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
        <p className="text-xs text-yellow-500/80 leading-relaxed">
          <strong>Risk Disclaimer:</strong> These AI-generated trade setups are for informational purposes only and do not constitute financial advice. Always perform your own due diligence and never risk capital you cannot afford to lose.
        </p>
      </div>
    </div>
  );
}
