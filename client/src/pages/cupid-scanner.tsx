import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Heart, TrendingUp, Target, AlertTriangle, ChevronDown, ChevronUp, LineChart, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { StockChart } from "@/components/stock-chart";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CupidSetupResult {
  symbol: string;
  name: string;
  currentPrice: number;
  patternDetected: boolean;
  confidence: number;
  uptrendStrength: number;
  pullbackDepth: number;
  pullbackSmoothness: number;
  pullbackAngle: number;
  swingHigh: number;
  swingLow: number;
  entryZone: { low: number; high: number };
  stopLoss: number;
  targetPrice: number;
  riskRewardRatio: number;
  details: string[];
}

export default function CupidScanner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("");

  const { data: results, isLoading, isRefetching } = useQuery<CupidSetupResult[]>({
    queryKey: ['/api/market/cupid-scanner'],
    staleTime: 5 * 60 * 1000,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (result: CupidSetupResult) => {
      return apiRequest('POST', '/api/trading-orders', {
        symbol: result.symbol,
        action: 'BUY',
        orderType: 'LIMIT',
        quantity: 1,
        entryPrice: result.entryZone.high.toString(),
        stopLoss: result.stopLoss.toString(),
        takeProfit: result.targetPrice.toString(),
        notes: `Cupid Setup - ${result.confidence}% confidence, R/R: ${result.riskRewardRatio.toFixed(1)}`,
      });
    },
    onSuccess: () => {
      toast({ title: "Draft order created", description: "Go to IBKR Trading to review and submit" });
      queryClient.invalidateQueries({ queryKey: ['/api/trading-orders'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create order", description: error.message, variant: "destructive" });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/market/cupid-scanner'] });
  };

  const openChart = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChartSymbol(symbol);
    setChartOpen(true);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-500 bg-green-500/10";
    if (confidence >= 60) return "text-yellow-500 bg-yellow-500/10";
    return "text-red-500 bg-red-500/10";
  };

  const getRRColor = (rr: number) => {
    if (rr >= 3) return "text-green-500";
    if (rr >= 2) return "text-yellow-500";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500" />
            Cupid Setup Scanner
          </h1>
          <p className="text-muted-foreground">
            Find stocks with the perfect pullback buy setup
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          variant="outline"
          data-testid="button-refresh-cupid"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Scan Stocks
        </Button>
      </div>

      <Card className="p-4 bg-pink-500/5 border-pink-500/20">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Target className="w-4 h-4 text-pink-500" />
          Cupid Setup Criteria
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Stock is in an uptrend with higher highs and higher lows</li>
          <li>Sequential pullback from recent high</li>
          <li>Smooth pullback with less than 50% candle overlap</li>
          <li>Pullback level between 30-70% (Fibonacci zone)</li>
          <li>Pullback angle around 45 degrees (not too steep)</li>
        </ul>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-12 h-12 animate-spin text-pink-500 mb-4" />
          <p className="text-muted-foreground">Scanning 50 popular stocks for Cupid setups...</p>
          <p className="text-xs text-muted-foreground mt-1">This may take 30-60 seconds</p>
        </div>
      ) : results && results.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {results.length} stock{results.length !== 1 ? 's' : ''} matching the Cupid Setup pattern
          </p>
          
          {results.map((result) => (
            <Card 
              key={result.symbol} 
              className="overflow-hidden hover-elevate cursor-pointer"
              onClick={() => setExpandedSymbol(expandedSymbol === result.symbol ? null : result.symbol)}
              data-testid={`card-cupid-${result.symbol}`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => openChart(result.symbol, e)}
                        data-testid={`button-chart-${result.symbol}`}
                      >
                        <LineChart className="w-4 h-4" />
                      </Button>
                      <div>
                        <span 
                          className="font-mono font-bold text-lg cursor-pointer hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/analysis?symbol=${result.symbol}`);
                          }}
                          data-testid={`link-symbol-${result.symbol}`}
                        >
                          {result.symbol}
                        </span>
                        <p className="text-sm text-muted-foreground">{result.name}</p>
                      </div>
                    </div>
                    <Badge className={getConfidenceColor(result.confidence)}>
                      {result.confidence}% Match
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Current Price</p>
                      <p className="font-mono font-semibold">${result.currentPrice.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">R:R Ratio</p>
                      <p className={`font-mono font-semibold ${getRRColor(result.riskRewardRatio)}`}>
                        {result.riskRewardRatio.toFixed(1)}:1
                      </p>
                    </div>
                    {expandedSymbol === result.symbol ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {expandedSymbol === result.symbol && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Entry Zone</p>
                        <p className="font-mono font-semibold text-green-500">
                          ${result.entryZone.low.toFixed(2)} - ${result.entryZone.high.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                        <p className="font-mono font-semibold text-red-500">
                          ${result.stopLoss.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Target Price</p>
                        <p className="font-mono font-semibold text-blue-500">
                          ${result.targetPrice.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Swing High</p>
                        <p className="font-mono font-semibold">
                          ${result.swingHigh.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-2">
                        <p className="text-xs text-muted-foreground">Uptrend Strength</p>
                        <p className="font-semibold">{result.uptrendStrength.toFixed(0)}%</p>
                      </div>
                      <div className="text-center p-2">
                        <p className="text-xs text-muted-foreground">Pullback Depth</p>
                        <p className="font-semibold">{result.pullbackDepth.toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-2">
                        <p className="text-xs text-muted-foreground">Candle Overlap</p>
                        <p className="font-semibold">{result.pullbackSmoothness.toFixed(0)}%</p>
                      </div>
                      <div className="text-center p-2">
                        <p className="text-xs text-muted-foreground">Pullback Angle</p>
                        <p className="font-semibold">{result.pullbackAngle.toFixed(0)}°</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium">Pattern Analysis:</p>
                      {result.details.map((detail, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" />
                          {detail}
                        </p>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/analysis?symbol=${result.symbol}`);
                        }}
                        data-testid={`button-analyze-${result.symbol}`}
                      >
                        Analyze Stock
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => openChart(result.symbol, e)}
                      >
                        View Chart
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          createOrderMutation.mutate(result);
                        }}
                        disabled={createOrderMutation.isPending}
                        data-testid={`button-trade-${result.symbol}`}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        {createOrderMutation.isPending ? 'Creating...' : 'Trade'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Cupid Setups Found</h3>
          <p className="text-muted-foreground mb-4">
            No stocks currently match the Cupid Setup criteria. 
            This is normal during strong trends or high volatility periods.
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Scan Again
          </Button>
        </Card>
      )}

      <StockChart
        symbol={chartSymbol}
        open={chartOpen}
        onOpenChange={setChartOpen}
      />
    </div>
  );
}
