import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertTriangle,
  DollarSign,
  Clock,
  BarChart3,
  Activity,
  Send,
  LineChart,
  Globe
} from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { StockChart } from "@/components/stock-chart";

interface TechnicalIndicator {
  name: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral";
}

interface Recommendation {
  symbol: string;
  recommendation: "BUY" | "SELL";
  entryPrice: string;
  takeProfit: string;
  stopLoss: string;
  riskReward: string;
  rationale: string;
  candlePattern?: string;
  trendType?: string;
  movingAverages?: {
    ma20: string;
    ma40: string;
    ma100: string;
    ma150: string;
    ma200: string;
  };
  technicalSummary?: string;
  supportResistance?: {
    support1: string;
    support2: string;
    resistance1: string;
    resistance2: string;
  };
  optionsStrategy?: {
    strategy: string;
    description: string;
    strikePrice: string;
    targetStrike: string;
    expiry: string;
    maxProfit: string;
    maxRisk: string;
    rationale: string;
  } | null;
  positionSize?: string;
  riskAmount?: string;
}

type Timeframe = "day" | "month" | "swing" | "longterm";
type MarketType = "US" | "SG" | "HK" | "CN" | "EU";

const timeframeLabels: Record<Timeframe, string> = {
  day: "Day Trading (Intraday)",
  month: "Monthly Trade (1-4 weeks)",
  swing: "Swing Trade (3-9 months)",
  longterm: "Long-term Investment (1+ year)"
};

const marketLabels: Record<MarketType, string> = {
  US: "United States",
  SG: "Singapore",
  HK: "Hong Kong",
  CN: "China",
  EU: "Europe"
};

export default function MarketScan() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isScanning, setIsScanning] = useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [riskAmount, setRiskAmount] = useState<string>("100");
  const [timeframe, setTimeframe] = useState<Timeframe>("day");
  const [selectedMarket, setSelectedMarket] = useState<MarketType>("US");
  const [chartOpen, setChartOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("");

  // Fetch market preferences to get the selected movers market
  const { data: marketPrefs } = useQuery<{
    selectedMoversMarket: string;
  }>({
    queryKey: ['/api/market/preferences'],
  });

  // Sync with user's preferred market on load (in useEffect to avoid render-time state updates)
  useEffect(() => {
    const preferredMarket = marketPrefs?.selectedMoversMarket as MarketType;
    if (preferredMarket && preferredMarket !== selectedMarket) {
      setSelectedMarket(preferredMarket);
    }
  }, [marketPrefs?.selectedMoversMarket]);

  const openChart = (symbol: string) => {
    setChartSymbol(symbol);
    setChartOpen(true);
  };

  const createOrderMutation = useMutation({
    mutationFn: async (rec: Recommendation) => {
      const quantity = rec.positionSize ? parseInt(rec.positionSize) : 10;
      return apiRequest("POST", "/api/trading-orders", {
        symbol: rec.symbol,
        action: rec.recommendation === "BUY" ? "BUY" : "SELL",
        orderType: "LIMIT",
        quantity,
        entryPrice: rec.entryPrice,
        stopLoss: rec.stopLoss,
        takeProfit: rec.takeProfit,
        notes: `From AI Scanner: ${rec.rationale?.substring(0, 200)}...`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-orders"] });
      toast({ 
        title: "Order Created", 
        description: "Draft order created. Go to Trading to review and submit." 
      });
      setLocation("/trading");
    },
    onError: () => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to create order." 
      });
    },
  });

  const { data: recommendations, isLoading } = useQuery<Recommendation[]>({
    queryKey: ["/api/sp500/recommendations"],
  });

  const handleScan = async () => {
    if (!riskAmount || parseFloat(riskAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Risk Amount",
        description: "Please enter a valid risk amount greater than $0.",
      });
      return;
    }

    setIsScanning(true);
    try {
      await apiRequest("POST", "/api/sp500/scan", {
        riskAmount: parseFloat(riskAmount),
        timeframe: timeframe,
        market: selectedMarket
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sp500/recommendations"] });
      toast({
        title: "Scan Complete",
        description: `Generated top 5 ${marketLabels[selectedMarket]} ${timeframeLabels[timeframe].toLowerCase()} setups with $${riskAmount} risk per trade.`,
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

  const getSignalColor = (signal: string) => {
    if (signal === "bullish") return "text-green-500";
    if (signal === "bearish") return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Scan className="w-6 h-6 text-primary" />
          AI Market Scanner
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Get personalized trade recommendations with detailed technical analysis
        </p>
      </div>

      {/* Scan Configuration */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Scan Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label htmlFor="market" className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Market Region
            </Label>
            <Select value={selectedMarket} onValueChange={(v) => setSelectedMarket(v as MarketType)}>
              <SelectTrigger data-testid="select-market">
                <SelectValue placeholder="Select market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="SG">Singapore</SelectItem>
                <SelectItem value="HK">Hong Kong</SelectItem>
                <SelectItem value="CN">China</SelectItem>
                <SelectItem value="EU">Europe</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Aligned with your dashboard preference
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk-amount" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Risk Amount Per Trade
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="risk-amount"
                type="number"
                min="1"
                step="10"
                value={riskAmount}
                onChange={(e) => setRiskAmount(e.target.value)}
                className="pl-7"
                placeholder="100"
                data-testid="input-risk-amount"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum amount you're willing to risk on each trade
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeframe" className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Trading Timeframe
            </Label>
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
              <SelectTrigger data-testid="select-timeframe">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day Trading (Intraday)</SelectItem>
                <SelectItem value="month">Monthly Trade (1-4 weeks)</SelectItem>
                <SelectItem value="swing">Swing Trade (3-9 months)</SelectItem>
                <SelectItem value="longterm">Long-term Investment (1+ year)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How long do you plan to hold these positions?
            </p>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={handleScan} 
              disabled={isScanning}
              className="w-full"
              size="lg"
              data-testid="button-run-scan"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Market...
                </>
              ) : (
                <>
                  <Scan className="mr-2 h-4 w-4" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-card/50 rounded-xl animate-pulse" />)}
        </div>
      ) : recommendations && recommendations.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Top 5 Trade Recommendations
            </h3>
            <span className="text-xs text-muted-foreground">
              Based on technical analysis and market conditions
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {recommendations.slice(0, 5).map((rec, idx) => (
              <Card key={`${rec.symbol}-${idx}`} className="overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center",
                        rec.recommendation === "BUY" ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        {rec.recommendation === "BUY" ? (
                          <TrendingUp className="w-7 h-7 text-green-500" />
                        ) : (
                          <TrendingDown className="w-7 h-7 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost"
                            onClick={() => openChart(rec.symbol)}
                            className="text-2xl font-bold font-mono p-0 h-auto"
                            data-testid={`button-chart-rec-${rec.symbol}`}
                          >
                            {rec.symbol}
                            <LineChart className="w-4 h-4 ml-1" />
                          </Button>
                          <span className={cn(
                            "text-xs font-bold px-2 py-1 rounded-full",
                            rec.recommendation === "BUY" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                          )}>
                            {rec.recommendation}
                          </span>
                        </div>
                        {rec.trendType && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Pattern: <span className="font-medium text-foreground">{rec.trendType}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
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

                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm"
                        onClick={() => createOrderMutation.mutate(rec)}
                        disabled={createOrderMutation.isPending}
                        data-testid={`button-trade-${rec.symbol}`}
                      >
                        {createOrderMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Send className="w-4 h-4 mr-1" />
                        )}
                        Trade
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setExpandedSymbol(expandedSymbol === rec.symbol ? null : rec.symbol)}
                        data-testid={`button-expand-${rec.symbol}`}
                      >
                        {expandedSymbol === rec.symbol ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </div>
                  </div>

                  {/* Position Sizing */}
                  {rec.positionSize && (
                    <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-sm">
                        <span className="font-medium">Suggested Position:</span>{" "}
                        <span className="font-mono font-bold">{rec.positionSize} shares</span>
                        {rec.riskAmount && (
                          <span className="text-muted-foreground"> (${rec.riskAmount} risk)</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Expanded Technical Analysis */}
                  {expandedSymbol === rec.symbol && (
                    <div className="mt-6 pt-6 border-t space-y-4 animate-in fade-in slide-in-from-top-2">
                      {/* Moving Averages */}
                      {rec.movingAverages && (
                        <div>
                          <h4 className="font-bold mb-3 flex items-center gap-2 text-sm">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            Moving Averages Analysis
                          </h4>
                          <div className="grid grid-cols-5 gap-3">
                            {Object.entries(rec.movingAverages).map(([key, value]) => (
                              <div key={key} className="p-3 rounded-lg bg-secondary/50 text-center">
                                <p className="text-xs text-muted-foreground uppercase">{key.toUpperCase()}</p>
                                <p className="font-mono font-bold text-sm mt-1">${value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Candle Pattern */}
                      {rec.candlePattern && (
                        <div>
                          <h4 className="font-bold mb-2 flex items-center gap-2 text-sm">
                            <Activity className="w-4 h-4 text-primary" />
                            Candlestick Pattern
                          </h4>
                          <p className="text-sm text-muted-foreground p-3 rounded-lg bg-secondary/50">
                            {rec.candlePattern}
                          </p>
                        </div>
                      )}

                      {/* Support & Resistance Levels */}
                      {rec.supportResistance && (
                        <div>
                          <h4 className="font-bold mb-3 flex items-center gap-2 text-sm">
                            <Target className="w-4 h-4 text-primary" />
                            Support & Resistance Levels
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-red-500/10 text-center">
                              <p className="text-xs text-muted-foreground uppercase">Support 1</p>
                              <p className="font-mono font-bold text-sm mt-1 text-red-500">${rec.supportResistance.support1}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-red-500/10 text-center">
                              <p className="text-xs text-muted-foreground uppercase">Support 2</p>
                              <p className="font-mono font-bold text-sm mt-1 text-red-500">${rec.supportResistance.support2}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-green-500/10 text-center">
                              <p className="text-xs text-muted-foreground uppercase">Resistance 1</p>
                              <p className="font-mono font-bold text-sm mt-1 text-green-500">${rec.supportResistance.resistance1}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-green-500/10 text-center">
                              <p className="text-xs text-muted-foreground uppercase">Resistance 2</p>
                              <p className="font-mono font-bold text-sm mt-1 text-green-500">${rec.supportResistance.resistance2}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Options Strategy */}
                      {rec.optionsStrategy && (
                        <div>
                          <h4 className="font-bold mb-3 flex items-center gap-2 text-sm">
                            <Scale className="w-4 h-4 text-primary" />
                            Options Trading Strategy
                          </h4>
                          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/20 text-primary">
                                {rec.optionsStrategy.strategy}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Expiry: {rec.optionsStrategy.expiry}
                              </span>
                            </div>
                            <p className="text-sm">{rec.optionsStrategy.description}</p>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              <div className="text-sm">
                                <span className="text-muted-foreground">Strike Price:</span>{" "}
                                <span className="font-mono font-bold">${rec.optionsStrategy.strikePrice}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Target Strike:</span>{" "}
                                <span className="font-mono font-bold">${rec.optionsStrategy.targetStrike}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-sm text-green-500">
                                <span className="text-muted-foreground">Max Profit:</span> {rec.optionsStrategy.maxProfit}
                              </div>
                              <div className="text-sm text-red-500">
                                <span className="text-muted-foreground">Max Risk:</span> {rec.optionsStrategy.maxRisk}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground italic mt-2">
                              {rec.optionsStrategy.rationale}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Technical Summary */}
                      {rec.technicalSummary && (
                        <div>
                          <h4 className="font-bold mb-2 flex items-center gap-2 text-sm">
                            <Target className="w-4 h-4 text-primary" />
                            Technical Summary
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {rec.technicalSummary}
                          </p>
                        </div>
                      )}

                      {/* Rationale */}
                      <div>
                        <h4 className="font-bold mb-2 flex items-center gap-2 text-sm">
                          <Scan className="w-4 h-4 text-primary" />
                          AI Analysis & Rationale
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {rec.rationale}
                        </p>
                      </div>

                      {/* Deep Chart Analysis Link */}
                      <div className="pt-4 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => openChart(rec.symbol)}
                          className="w-full"
                          data-testid={`button-deep-analysis-${rec.symbol}`}
                        >
                          <LineChart className="w-4 h-4 mr-2" />
                          View Full Chart Analysis
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto flex items-center justify-center mb-4">
            <Scan className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No recommendations yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            Configure your risk amount and trading timeframe, then run a scan to generate personalized recommendations.
          </p>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
        <p className="text-xs text-yellow-500/80 leading-relaxed">
          <strong>Risk Disclaimer:</strong> These AI-generated trade setups are for informational purposes only and do not constitute financial advice. Always perform your own due diligence and never risk capital you cannot afford to lose.
        </p>
      </div>

      <StockChart
        symbol={chartSymbol}
        open={chartOpen}
        onOpenChange={setChartOpen}
      />
    </div>
  );
}
