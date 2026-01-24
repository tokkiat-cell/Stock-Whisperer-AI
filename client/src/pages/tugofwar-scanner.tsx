import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sword, ChevronDown, ChevronUp, Target, TrendingUp, RefreshCw } from 'lucide-react';
import { StockChart } from '@/components/stock-chart';

interface TugOfWarResult {
  symbol: string;
  name: string;
  currentPrice: number;
  patternDetected: boolean;
  confidence: number;
  marketStage: 'Accumulation' | 'Uptrend' | 'Distribution' | 'Downtrend';
  entryLevel: number;
  stopLoss: number;
  targetPrice: number;
  riskRewardRatio: number;
  consolidationTightness: number;
  hasShakeoutBar: boolean;
  nearMovingAverage: boolean;
  maDistance: number;
  isUptrend: boolean;
  isGoodLocation: boolean;
  setupNotes: string[];
  supportLevel: number;
  resistanceLevel: number;
  trendDirection: 'up' | 'down' | 'sideways';
  consolidationHigh: number;
  consolidationLow: number;
}

interface ScanResponse {
  results: TugOfWarResult[];
  totalScanned: number;
  scanTime: number;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-green-500';
  if (confidence >= 60) return 'text-yellow-500';
  return 'text-orange-500';
}

function getStageColor(stage: string): string {
  switch (stage) {
    case 'Accumulation': return 'bg-blue-500/20 text-blue-500';
    case 'Uptrend': return 'bg-green-500/20 text-green-500';
    case 'Distribution': return 'bg-yellow-500/20 text-yellow-500';
    case 'Downtrend': return 'bg-red-500/20 text-red-500';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getRRColor(rr: number): string {
  if (rr >= 3) return 'text-green-500';
  if (rr >= 2) return 'text-yellow-500';
  return 'text-orange-500';
}

interface ChartLevels {
  support?: number;
  resistance?: number;
  entry?: number;
  stopLoss?: number;
  target?: number;
}

export default function TugOfWarScanner() {
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartLevels, setChartLevels] = useState<ChartLevels | undefined>(undefined);

  const { data: response, isLoading, isRefetching } = useQuery<ScanResponse>({
    queryKey: ['/api/market/tugofwar-scanner'],
    staleTime: 5 * 60 * 1000,
  });

  const queryClient = useQueryClient();
  const results = response?.results || [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/market/tugofwar-scanner'] });
  };

  const openChart = (symbol: string, levels?: ChartLevels) => {
    setChartSymbol(symbol);
    setChartLevels(levels);
    setChartOpen(true);
  };

  return (
    <div className="space-y-6 p-6" data-testid="tugofwar-scanner-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <Sword className="w-6 h-6 text-orange-500" />
            Tug of War Scanner
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            Find tight consolidation patterns with flat tops near moving averages
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isLoading || isRefetching}
          data-testid="button-scan"
        >
          {isLoading || isRefetching ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Scan for Setups
        </Button>
      </div>

      <Card className="p-4 bg-card/50" data-testid="card-criteria">
        <h3 className="font-semibold mb-2">Tug of War Setup Criteria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-1">Pattern Requirements</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li data-testid="criteria-1">Uptrend preferred (above 20/50 SMA)</li>
              <li data-testid="criteria-2">Tight consolidation with flat top (ruler-like)</li>
              <li data-testid="criteria-3">Near moving average support</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">Entry Signal</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li data-testid="criteria-4">Shakeout bar is a good sign</li>
              <li data-testid="criteria-5">Entry above consolidation high</li>
              <li data-testid="criteria-6">Stop below consolidation low</li>
            </ul>
          </div>
        </div>
      </Card>

      {isLoading || isRefetching ? (
        <div className="flex flex-col items-center justify-center py-16" data-testid="loading-state">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" data-testid="loading-spinner" />
          <p className="text-muted-foreground" data-testid="text-loading">Scanning 50 popular stocks for Tug of War setups...</p>
          <p className="text-xs text-muted-foreground mt-1" data-testid="text-loading-time">This may take 30-60 seconds</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" data-testid="text-results-summary">
            Found {results.length} stock{results.length !== 1 ? 's' : ''} matching the Tug of War Setup pattern
            {response && ` (scanned ${response.totalScanned} stocks in ${(response.scanTime / 1000).toFixed(1)}s)`}
          </p>
          
          {results.map((result) => (
            <Card 
              key={result.symbol} 
              className="overflow-hidden hover-elevate cursor-pointer"
              onClick={() => setExpandedSymbol(expandedSymbol === result.symbol ? null : result.symbol)}
              data-testid={`card-result-${result.symbol}`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-bold text-lg cursor-pointer hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); openChart(result.symbol, { support: result.supportLevel, resistance: result.resistanceLevel, entry: result.entryLevel, stopLoss: result.stopLoss, target: result.targetPrice }); }}
                          data-testid={`text-symbol-${result.symbol}`}
                        >
                          {result.symbol}
                        </span>
                        <Badge variant="outline" className={getStageColor(result.marketStage)} data-testid={`badge-stage-${result.symbol}`}>
                          {result.marketStage}
                        </Badge>
                        {result.isUptrend && (
                          <Badge variant="outline" className="bg-green-500/20 text-green-500" data-testid={`badge-uptrend-${result.symbol}`}>
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Uptrend
                          </Badge>
                        )}
                        {result.hasShakeoutBar && (
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500" data-testid={`badge-shakeout-${result.symbol}`}>
                            Shakeout
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-name-${result.symbol}`}>{result.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold" data-testid={`text-price-${result.symbol}`}>${result.currentPrice.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Current Price</p>
                    </div>
                    <Badge className={getConfidenceColor(result.confidence)} data-testid={`badge-confidence-${result.symbol}`}>
                      {result.confidence}% Confidence
                    </Badge>
                    {expandedSymbol === result.symbol ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-4 text-sm" data-testid={`metrics-row-${result.symbol}`}>
                  <div>
                    <span className="text-muted-foreground">Tightness: </span>
                    <span className="text-foreground" data-testid={`text-tightness-${result.symbol}`}>
                      {result.consolidationTightness.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MA Distance: </span>
                    <span className={result.nearMovingAverage ? "text-green-500" : "text-muted-foreground"} data-testid={`text-madist-${result.symbol}`}>
                      {result.maDistance.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">R:R: </span>
                    <span className={getRRColor(result.riskRewardRatio)} data-testid={`text-rr-${result.symbol}`}>
                      {result.riskRewardRatio.toFixed(2)}:1
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Range: </span>
                    <span className="text-foreground" data-testid={`text-range-${result.symbol}`}>
                      ${result.consolidationLow.toFixed(2)} - ${result.consolidationHigh.toFixed(2)}
                    </span>
                  </div>
                </div>

                {expandedSymbol === result.symbol && (
                  <div className="mt-4 pt-4 border-t space-y-4" data-testid={`expanded-${result.symbol}`}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-card p-3 rounded-md border" data-testid={`entry-card-${result.symbol}`}>
                        <p className="text-xs text-muted-foreground">Entry Level</p>
                        <p className="font-semibold text-blue-500" data-testid={`text-entry-${result.symbol}`}>${result.entryLevel.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Above consolidation high</p>
                      </div>
                      <div className="bg-card p-3 rounded-md border" data-testid={`stoploss-card-${result.symbol}`}>
                        <p className="text-xs text-muted-foreground">Stop Loss</p>
                        <p className="font-semibold text-red-500" data-testid={`text-stoploss-${result.symbol}`}>${result.stopLoss.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Below consolidation low</p>
                      </div>
                      <div className="bg-card p-3 rounded-md border" data-testid={`target-card-${result.symbol}`}>
                        <p className="text-xs text-muted-foreground">Target (2R)</p>
                        <p className="font-semibold text-green-500" data-testid={`text-target-${result.symbol}`}>${result.targetPrice.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">2x risk reward</p>
                      </div>
                      <div className="bg-card p-3 rounded-md border" data-testid={`sr-card-${result.symbol}`}>
                        <p className="text-xs text-muted-foreground">Support/Resistance</p>
                        <p className="font-semibold" data-testid={`text-sr-${result.symbol}`}>
                          ${result.supportLevel.toFixed(2)} / ${result.resistanceLevel.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">Key levels</p>
                      </div>
                    </div>

                    <div className="bg-card/50 p-3 rounded-md">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Setup Analysis
                      </h4>
                      <ul className="space-y-1 text-sm" data-testid={`details-${result.symbol}`}>
                        {result.setupNotes.map((note, idx) => (
                          <li key={idx} className="flex items-center gap-2" data-testid={`detail-${result.symbol}-${idx}`}>
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={(e) => { e.stopPropagation(); openChart(result.symbol, { support: result.supportLevel, resistance: result.resistanceLevel, entry: result.entryLevel, stopLoss: result.stopLoss, target: result.targetPrice }); }}
                      data-testid={`button-chart-${result.symbol}`}
                    >
                      View Chart
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : response ? (
        <Card className="p-8 text-center" data-testid="card-no-results">
          <Sword className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2" data-testid="text-no-results-title">No Tug of War Setups Found</h3>
          <p className="text-muted-foreground" data-testid="text-no-results-message">
            No stocks are currently showing tight consolidation patterns.
            These setups work best in trending markets.
          </p>
        </Card>
      ) : (
        <Card className="p-8 text-center" data-testid="card-ready-to-scan">
          <Sword className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2" data-testid="text-ready-title">Ready to Scan</h3>
          <p className="text-muted-foreground mb-4" data-testid="text-ready-message">
            Click "Scan for Setups" to find stocks with tight consolidation patterns
          </p>
          <Button onClick={handleRefresh} data-testid="button-scan-initial">
            <Sword className="w-4 h-4 mr-2" />
            Start Scanning
          </Button>
        </Card>
      )}

      <StockChart
        symbol={chartSymbol || ''}
        open={chartOpen}
        onOpenChange={setChartOpen}
        levels={chartLevels}
      />
    </div>
  );
}
