import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Zap, TrendingUp, Target, ChevronDown, ChevronUp, LineChart, ArrowUpRight, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { StockChart } from "@/components/stock-chart";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PowerRangerResult {
  symbol: string;
  name: string;
  currentPrice: number;
  patternDetected: boolean;
  confidence: number;
  gapPercent: number;
  gapQualityScore: number;
  relativeStrength: number;
  rangeHigh: number;
  rangeLow: number;
  entryLevel: number;
  stopLoss: number;
  targetPrice: number;
  roomToTarget: number;
  riskRewardRatio: number;
  shockValue: string;
  details: string[];
}

interface ScannerResponse {
  matches: PowerRangerResult[];
  totalScanned: number;
  scanTime: number;
}

export default function PowerRangerScanner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("");

  const { data: response, isLoading, isRefetching } = useQuery<ScannerResponse>({
    queryKey: ['/api/market/powerranger-scanner'],
    staleTime: 5 * 60 * 1000,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (result: PowerRangerResult) => {
      return apiRequest('POST', '/api/trading-orders', {
        symbol: result.symbol,
        action: 'BUY',
        orderType: 'LIMIT',
        quantity: 1,
        entryPrice: result.entryLevel.toString(),
        stopLoss: result.stopLoss.toString(),
        takeProfit: result.targetPrice.toString(),
        notes: `Power Ranger Setup - ${result.confidence}% confidence, Gap: ${result.gapPercent.toFixed(1)}%`,
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
    queryClient.invalidateQueries({ queryKey: ['/api/market/powerranger-scanner'] });
  };

  const openChart = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChartSymbol(symbol);
    setChartOpen(true);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-500 bg-green-500/10";
    if (confidence >= 60) return "text-yellow-500 bg-yellow-500/10";
    return "text-orange-500 bg-orange-500/10";
  };

  const getGapQualityColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const getShockBadge = (shock: string) => {
    switch (shock) {
      case "High":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">High Shock</Badge>;
      case "Medium":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Med Shock</Badge>;
      default:
        return null;
    }
  };

  const getRRColor = (rr: number) => {
    if (rr >= 3) return "text-green-500";
    if (rr >= 2) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const results = response?.matches || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-green-500" />
            Power Ranger Setup Scanner
          </h1>
          <p className="text-muted-foreground">
            Find gap-up stocks with consolidation range breakout setups
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          data-testid="button-scan-powerranger"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          {isLoading || isRefetching ? 'Scanning...' : 'Scan for Setups'}
        </Button>
      </div>

      <Card className="p-4 bg-green-500/5 border-green-500/20">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Target className="w-4 h-4 text-green-500" />
          Power Ranger Setup Criteria
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-1">Gap Quality</h4>
            <ul className="space-y-1">
              <li>Gap up 2%+ from previous close</li>
              <li>Shock value: gapping over wide-range red bars or pivots</li>
              <li>Room to next resistance for 2R-3R reward</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">Setup Pattern</h4>
            <ul className="space-y-1">
              <li>Forms tight consolidation range after gap</li>
              <li>Strong relative strength vs SPY</li>
              <li>Entry: breakout above range high</li>
              <li>Stop: below range low or gap low</li>
            </ul>
          </div>
        </div>
      </Card>

      {isLoading || isRefetching ? (
        <div className="flex flex-col items-center justify-center py-16" data-testid="loading-state">
          <Loader2 className="w-12 h-12 animate-spin text-green-500 mb-4" data-testid="loading-spinner" />
          <p className="text-muted-foreground" data-testid="text-loading">Scanning 50 popular stocks for Power Ranger setups...</p>
          <p className="text-xs text-muted-foreground mt-1" data-testid="text-loading-time">This may take 30-60 seconds</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" data-testid="text-results-summary">
            Found {results.length} stock{results.length !== 1 ? 's' : ''} matching the Power Ranger Setup pattern
            {response && ` (scanned ${response.totalScanned} stocks in ${(response.scanTime / 1000).toFixed(1)}s)`}
          </p>
          
          {results.map((result) => (
            <Card 
              key={result.symbol} 
              className="overflow-hidden hover-elevate cursor-pointer"
              onClick={() => setExpandedSymbol(expandedSymbol === result.symbol ? null : result.symbol)}
              data-testid={`card-powerranger-${result.symbol}`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg" data-testid={`text-symbol-${result.symbol}`}>{result.symbol}</span>
                        <Badge className={getConfidenceColor(result.confidence)} data-testid={`badge-confidence-${result.symbol}`}>
                          {result.confidence}%
                        </Badge>
                        {getShockBadge(result.shockValue)}
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-name-${result.symbol}`}>{result.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold" data-testid={`text-price-${result.symbol}`}>${result.currentPrice.toFixed(2)}</p>
                      <p className="text-sm text-green-500 flex items-center justify-end gap-1" data-testid={`text-gap-${result.symbol}`}>
                        <ArrowUpRight className="w-3 h-3" />
                        Gap +{result.gapPercent.toFixed(1)}%
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => openChart(result.symbol, e)}
                        data-testid={`button-chart-${result.symbol}`}
                      >
                        <LineChart className="w-4 h-4" />
                      </Button>
                      {expandedSymbol === result.symbol ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-3 text-sm" data-testid={`metrics-row-${result.symbol}`}>
                  <div>
                    <span className="text-muted-foreground">Gap Quality: </span>
                    <span className={getGapQualityColor(result.gapQualityScore)} data-testid={`text-gapquality-${result.symbol}`}>
                      {result.gapQualityScore}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">RS vs SPY: </span>
                    <span className={result.relativeStrength > 0 ? "text-green-500" : "text-red-500"} data-testid={`text-rs-${result.symbol}`}>
                      {result.relativeStrength > 0 ? '+' : ''}{result.relativeStrength.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">R:R: </span>
                    <span className={getRRColor(result.riskRewardRatio)} data-testid={`text-rr-${result.symbol}`}>
                      {result.riskRewardRatio.toFixed(2)}:1
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Room: </span>
                    <span className="text-foreground" data-testid={`text-room-${result.symbol}`}>
                      {result.roomToTarget.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {expandedSymbol === result.symbol && (
                  <div className="mt-4 pt-4 border-t space-y-4" data-testid={`expanded-${result.symbol}`}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-card p-3 rounded-md border" data-testid={`entry-card-${result.symbol}`}>
                        <p className="text-xs text-muted-foreground">Entry Level</p>
                        <p className="font-semibold text-blue-500" data-testid={`text-entry-${result.symbol}`}>${result.entryLevel.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Above range high</p>
                      </div>
                      <div className="bg-card p-3 rounded-md border" data-testid={`stoploss-card-${result.symbol}`}>
                        <p className="text-xs text-muted-foreground">Stop Loss</p>
                        <p className="font-semibold text-red-500" data-testid={`text-stoploss-${result.symbol}`}>${result.stopLoss.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Below range low</p>
                      </div>
                      <div className="bg-card p-3 rounded-md border" data-testid={`target-card-${result.symbol}`}>
                        <p className="text-xs text-muted-foreground">Target</p>
                        <p className="font-semibold text-green-500" data-testid={`text-target-${result.symbol}`}>${result.targetPrice.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Next resistance</p>
                      </div>
                      <div className="bg-card p-3 rounded-md border" data-testid={`range-card-${result.symbol}`}>
                        <p className="text-xs text-muted-foreground">Range</p>
                        <p className="font-semibold" data-testid={`text-range-${result.symbol}`}>${result.rangeLow.toFixed(2)} - ${result.rangeHigh.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Consolidation zone</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Analysis Details</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {result.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">•</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2 pt-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/scan?symbol=${result.symbol}`);
                        }}
                        data-testid={`button-analyze-${result.symbol}`}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Full Analysis
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
      ) : response ? (
        <Card className="p-8 text-center" data-testid="card-no-results">
          <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2" data-testid="text-no-results-title">No Power Ranger Setups Found</h3>
          <p className="text-muted-foreground" data-testid="text-no-results-message">
            No stocks are currently showing the gap-up + consolidation pattern.
            Try again when the market opens or during volatile sessions.
          </p>
        </Card>
      ) : (
        <Card className="p-8 text-center" data-testid="card-ready-to-scan">
          <Zap className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2" data-testid="text-ready-title">Ready to Scan</h3>
          <p className="text-muted-foreground mb-4" data-testid="text-ready-message">
            Click "Scan for Setups" to find stocks with gap-up breakout patterns
          </p>
          <Button onClick={handleRefresh} data-testid="button-scan-powerranger-initial">
            <Zap className="w-4 h-4 mr-2" />
            Start Scanning
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
