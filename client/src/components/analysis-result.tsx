import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Activity, Target, Scale, BarChart3, ExternalLink } from "lucide-react";
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
        <Card className={cn("glass-panel flex-1 p-6 relative overflow-visible", bgAccent)}>
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
            {analysis.riskReward && (
              <div className="mt-3 flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Risk/Reward:</span>
                <span className="font-mono font-bold text-primary">{analysis.riskReward}:1</span>
              </div>
            )}
          </div>
        </Card>

        {/* Levels Card */}
        <Card className="glass-panel flex-1 p-6">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Key Levels
          </h3>
          <div className="space-y-3">
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
            {analysis.positionSize && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-sm text-primary/70">Position Size</span>
                <span className="font-mono font-bold text-sm text-primary">{analysis.positionSize}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Technical Analysis */}
      {analysis.technicalAnalysis && (
        <Card className="glass-panel p-6">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Technical Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground uppercase mb-1">Trend</p>
                <p className="font-medium">{analysis.technicalAnalysis.trend}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground uppercase mb-1">Candle Pattern</p>
                <p className="font-medium">{analysis.technicalAnalysis.candlePattern}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground uppercase mb-1">MACD</p>
                <p className="font-medium">{analysis.technicalAnalysis.macd}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground uppercase mb-1">RSI</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 bg-black/20 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full",
                        analysis.technicalAnalysis.rsi > 70 ? "bg-red-500" :
                        analysis.technicalAnalysis.rsi < 30 ? "bg-green-500" : "bg-primary"
                      )}
                      style={{ width: `${analysis.technicalAnalysis.rsi}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold">{analysis.technicalAnalysis.rsi}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground uppercase mb-2">Moving Averages</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">MA20</p>
                    <p className="font-mono text-sm font-bold">${analysis.technicalAnalysis.movingAverages.ma20}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">MA50</p>
                    <p className="font-mono text-sm font-bold">${analysis.technicalAnalysis.movingAverages.ma50}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">MA200</p>
                    <p className="font-mono text-sm font-bold">${analysis.technicalAnalysis.movingAverages.ma200}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Support & Resistance */}
      {analysis.supportResistance && (
        <Card className="glass-panel p-6">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Support & Resistance Levels
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-red-500/10 text-center">
              <p className="text-xs text-muted-foreground uppercase">Support 1</p>
              <p className="font-mono font-bold text-lg text-red-500">${analysis.supportResistance.support1}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 text-center">
              <p className="text-xs text-muted-foreground uppercase">Support 2</p>
              <p className="font-mono font-bold text-lg text-red-500">${analysis.supportResistance.support2}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 text-center">
              <p className="text-xs text-muted-foreground uppercase">Resistance 1</p>
              <p className="font-mono font-bold text-lg text-green-500">${analysis.supportResistance.resistance1}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 text-center">
              <p className="text-xs text-muted-foreground uppercase">Resistance 2</p>
              <p className="font-mono font-bold text-lg text-green-500">${analysis.supportResistance.resistance2}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Options Strategy */}
      {analysis.optionsStrategy && (
        <Card className="glass-panel p-6">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Options Trading Setup
          </h3>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-primary/20 text-primary">
                {analysis.optionsStrategy.strategy}
              </span>
              <span className="text-sm text-muted-foreground">
                Expiry: {analysis.optionsStrategy.expiry}
              </span>
            </div>
            <p className="text-muted-foreground">{analysis.optionsStrategy.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground uppercase">Strike Price</p>
                <p className="font-mono font-bold">${analysis.optionsStrategy.strikePrice}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground uppercase">Target Strike</p>
                <p className="font-mono font-bold">${analysis.optionsStrategy.targetStrike}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground uppercase">Breakeven</p>
                <p className="font-mono font-bold">${analysis.optionsStrategy.breakeven}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground uppercase">Expiry</p>
                <p className="font-mono font-bold">{analysis.optionsStrategy.expiry}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <p className="text-xs text-muted-foreground uppercase mb-1">Max Profit</p>
                <p className="text-sm text-green-500">{analysis.optionsStrategy.maxProfit}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <p className="text-xs text-muted-foreground uppercase mb-1">Max Risk</p>
                <p className="text-sm text-red-500">{analysis.optionsStrategy.maxRisk}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
              {analysis.optionsStrategy.rationale}
            </p>
          </div>
        </Card>
      )}

      {/* AI Rationale */}
      <Card className="glass-panel p-6">
        <h3 className="font-display font-bold text-lg mb-3 text-foreground/90">AI Rationale</h3>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {analysis.rationale}
        </p>
      </Card>

      {/* External Links */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          asChild
          className="w-full"
          data-testid="button-tradingview-analysis"
        >
          <a 
            href={`https://www.tradingview.com/chart/?symbol=${analysis.symbol}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on TradingView
          </a>
        </Button>
        </div>

      {!isHold && (
        <div className="flex justify-end pt-4">
          <Button 
            size="lg" 
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 shadow-xl shadow-primary/20 transition-all"
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
