import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisResponse } from "@shared/schema";

interface AnalysisResultProps {
  analysis: AnalysisResponse;
  onApprove: () => void;
  isPending: boolean;
}

export function AnalysisResult({ analysis, onApprove, isPending }: AnalysisResultProps) {
  const isBuy = analysis.recommendation === "BUY";
  const isHold = analysis.recommendation === "HOLD";
  
  const accentColor = isHold 
    ? "text-yellow-500" 
    : isBuy 
      ? "text-green-500" 
      : "text-red-500";
      
  const bgAccent = isHold 
    ? "bg-yellow-500/10" 
    : isBuy 
      ? "bg-green-500/10" 
      : "bg-red-500/10";

  return (
    <div className="animate-in mt-8 space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Recommendation Card */}
        <Card className={cn("glass-panel flex-1 p-6 relative overflow-hidden", bgAccent)}>
          <div className="absolute top-0 right-0 p-32 opacity-10 bg-gradient-to-br from-current to-transparent rounded-full transform translate-x-12 -translate-y-12 text-current pointer-events-none" />
          
          <div className="relative z-10">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">AI Recommendation</p>
            <h2 className={cn("text-4xl md:text-5xl font-display font-black tracking-tight mb-2", accentColor)}>
              {analysis.recommendation}
            </h2>
            <div className="flex items-center gap-2 mt-4">
              <div className="h-2 flex-1 bg-black/20 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-1000", isBuy ? "bg-green-500" : "bg-red-500")}
                  style={{ width: `${analysis.confidence}%` }}
                />
              </div>
              <span className="text-sm font-mono font-bold text-muted-foreground">{analysis.confidence}% Conf.</span>
            </div>
          </div>
        </Card>

        {/* Levels Card */}
        <Card className="glass-panel flex-1 p-6">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Key Levels
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
              <span className="text-sm text-muted-foreground">Entry Price</span>
              <span className="font-mono font-bold text-lg text-white">${analysis.entryPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
              <span className="text-sm text-green-500/70">Take Profit</span>
              <span className="font-mono font-bold text-lg text-green-500">${analysis.takeProfit.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <span className="text-sm text-red-500/70">Stop Loss</span>
              <span className="font-mono font-bold text-lg text-red-500">${analysis.stopLoss.toFixed(2)}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="glass-panel p-6">
        <h3 className="font-display font-bold text-lg mb-3 text-foreground/90">AI Rationale</h3>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {analysis.rationale}
        </p>
      </Card>

      {!isHold && (
        <div className="flex justify-end pt-4">
          <Button 
            size="lg" 
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 shadow-xl shadow-primary/20 hover:scale-105 transition-all"
            onClick={onApprove}
            disabled={isPending}
          >
            {isPending ? (
              <span className="animate-pulse">Creating Order...</span>
            ) : (
              <>
                Approve & Setup Trade <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
