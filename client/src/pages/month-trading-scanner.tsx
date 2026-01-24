import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, TrendingUp, Target, ChevronDown, ChevronUp, LineChart, ShoppingCart, ArrowUp, ArrowDown, Rocket, BarChart3, Activity, DollarSign, Calendar } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { StockChart } from "@/components/stock-chart";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MonthPatternType = 'breakout' | 'accumulation' | 'momentum' | 'value';

interface MonthTradingSetup {
  symbol: string;
  name: string;
  currentPrice: number;
  patternType: MonthPatternType;
  patternName: string;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  riskRewardRatio: number;
  supportLevel: number;
  resistanceLevel: number;
  details: string[];
  weeklyChange: number;
  weeklyChangePercent: number;
  monthlyChange: number;
  monthlyChangePercent: number;
}

const patternConfig: Record<MonthPatternType, { icon: typeof Rocket; color: string; bgColor: string }> = {
  breakout: { icon: Rocket, color: "text-green-500", bgColor: "bg-green-500/10" },
  accumulation: { icon: BarChart3, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  momentum: { icon: Activity, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  value: { icon: DollarSign, color: "text-purple-500", bgColor: "bg-purple-500/10" },
};

export default function MonthTradingScanner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("");
  const [chartLevels, setChartLevels] = useState<{ support?: number; resistance?: number; entry?: number; stopLoss?: number; target?: number }>({});
  const [patternFilter, setPatternFilter] = useState<MonthPatternType | 'all'>('all');

  const { data: results, isLoading, isRefetching } = useQuery<MonthTradingSetup[]>({
    queryKey: ['/api/market/month-trading-scanner'],
    staleTime: 10 * 60 * 1000,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (setup: MonthTradingSetup) => {
      return apiRequest('POST', '/api/moomoo-orders', {
        symbol: setup.symbol,
        action: 'BUY',
        orderType: 'LIMIT',
        quantity: 1,
        entryPrice: setup.entryPrice.toString(),
        stopLoss: setup.stopLoss.toString(),
        takeProfit: setup.targetPrice.toString(),
        notes: `${setup.patternName} - ${setup.confidence}% confidence, R/R: ${setup.riskRewardRatio.toFixed(1)}`,
      });
    },
    onSuccess: () => {
      toast({ title: "Draft order created", description: "Go to Moomoo Trading to review and submit" });
      queryClient.invalidateQueries({ queryKey: ['/api/moomoo-orders'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create order", description: error.message, variant: "destructive" });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/market/month-trading-scanner'] });
  };

  const openChart = (symbol: string, levels: typeof chartLevels, e: React.MouseEvent) => {
    e.stopPropagation();
    setChartSymbol(symbol);
    setChartLevels(levels);
    setChartOpen(true);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return "text-green-500 bg-green-500/10";
    if (confidence >= 55) return "text-yellow-500 bg-yellow-500/10";
    return "text-red-500 bg-red-500/10";
  };

  const getRRColor = (rr: number) => {
    if (rr >= 3) return "text-green-500";
    if (rr >= 2) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const filteredResults = results?.filter(r => patternFilter === 'all' || r.patternType === patternFilter) || [];

  const patternCounts = results?.reduce((acc, r) => {
    acc[r.patternType] = (acc[r.patternType] || 0) + 1;
    return acc;
  }, {} as Record<MonthPatternType, number>) || {};

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-month-scanner-title">
            <Calendar className="w-6 h-6 text-primary" />
            Month Trading Scanner
          </h1>
          <p className="text-muted-foreground" data-testid="text-month-scanner-description">
            Scans weekly charts for Breakout, Accumulation, Momentum & Value setups
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          variant="outline"
          data-testid="button-refresh-month-scanner"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Scan Stocks
        </Button>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Pattern Types
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={patternFilter === 'all' ? "default" : "outline"}
            size="sm"
            onClick={() => setPatternFilter('all')}
            data-testid="button-filter-all-month"
          >
            All ({results?.length || 0})
          </Button>
          {(Object.keys(patternConfig) as MonthPatternType[]).map(pattern => {
            const config = patternConfig[pattern];
            const Icon = config.icon;
            const count = patternCounts[pattern] || 0;
            return (
              <Button
                key={pattern}
                variant={patternFilter === pattern ? "default" : "outline"}
                size="sm"
                onClick={() => setPatternFilter(pattern)}
                className={patternFilter === pattern ? "" : config.bgColor}
                data-testid={`button-filter-${pattern}`}
              >
                <Icon className={`w-4 h-4 mr-1 ${patternFilter === pattern ? "" : config.color}`} />
                {pattern === 'breakout' ? 'Breakout' : 
                 pattern === 'accumulation' ? 'Accumulation' : 
                 pattern === 'momentum' ? 'Momentum' : 'Value'} ({count})
              </Button>
            );
          })}
        </div>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground" data-testid="text-loading-month">Scanning stocks for monthly setups...</p>
          <p className="text-xs text-muted-foreground mt-1">Analyzing weekly charts - this may take a minute</p>
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" data-testid="text-month-results-count">
            Found {filteredResults.length} setup{filteredResults.length !== 1 ? 's' : ''} 
            {patternFilter !== 'all' && ` matching ${patternFilter}`}
          </p>
          
          {filteredResults.map((setup) => {
            const config = patternConfig[setup.patternType];
            const Icon = config.icon;
            
            return (
              <Card 
                key={`${setup.symbol}-${setup.patternType}`} 
                className="overflow-hidden hover-elevate cursor-pointer"
                onClick={() => setExpandedSymbol(expandedSymbol === `${setup.symbol}-${setup.patternType}` ? null : `${setup.symbol}-${setup.patternType}`)}
                data-testid={`card-month-setup-${setup.symbol}-${setup.patternType}`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => openChart(setup.symbol, {
                            support: setup.supportLevel,
                            resistance: setup.resistanceLevel,
                            entry: setup.entryPrice,
                            stopLoss: setup.stopLoss,
                            target: setup.targetPrice,
                          }, e)}
                          data-testid={`button-chart-month-${setup.symbol}`}
                        >
                          <LineChart className="w-5 h-5" />
                        </Button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg" data-testid={`text-month-symbol-${setup.symbol}`}>{setup.symbol}</span>
                            <Badge className={`${config.bgColor} ${config.color} border-0`}>
                              <Icon className="w-3 h-3 mr-1" />
                              {setup.patternName}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{setup.name}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono font-bold" data-testid={`text-month-price-${setup.symbol}`}>
                          ${setup.currentPrice.toFixed(2)}
                        </div>
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <span className={setup.weeklyChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                            W: {setup.weeklyChangePercent >= 0 ? '+' : ''}{setup.weeklyChangePercent.toFixed(1)}%
                          </span>
                          <span className={setup.monthlyChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                            M: {setup.monthlyChangePercent >= 0 ? '+' : ''}{setup.monthlyChangePercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <Badge className={getConfidenceColor(setup.confidence)} data-testid={`badge-month-confidence-${setup.symbol}`}>
                        {setup.confidence.toFixed(0)}%
                      </Badge>
                      
                      <span className={`font-mono ${getRRColor(setup.riskRewardRatio)}`} data-testid={`text-month-rr-${setup.symbol}`}>
                        {setup.riskRewardRatio.toFixed(1)}R
                      </span>
                      
                      {expandedSymbol === `${setup.symbol}-${setup.patternType}` ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  {expandedSymbol === `${setup.symbol}-${setup.patternType}` && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg bg-green-500/10">
                          <p className="text-xs text-muted-foreground">Entry Price</p>
                          <p className="font-mono font-bold text-green-500" data-testid={`text-month-entry-${setup.symbol}`}>
                            ${setup.entryPrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-red-500/10">
                          <p className="text-xs text-muted-foreground">Stop Loss</p>
                          <p className="font-mono font-bold text-red-500" data-testid={`text-month-sl-${setup.symbol}`}>
                            ${setup.stopLoss.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-500/10">
                          <p className="text-xs text-muted-foreground">Target Price</p>
                          <p className="font-mono font-bold text-blue-500" data-testid={`text-month-tp-${setup.symbol}`}>
                            ${setup.targetPrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-500/10">
                          <p className="text-xs text-muted-foreground">Risk/Reward</p>
                          <p className={`font-mono font-bold ${getRRColor(setup.riskRewardRatio)}`}>
                            1:{setup.riskRewardRatio.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Support Level</p>
                          <p className="font-mono font-bold" data-testid={`text-month-support-${setup.symbol}`}>
                            ${setup.supportLevel.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Resistance Level</p>
                          <p className="font-mono font-bold" data-testid={`text-month-resistance-${setup.symbol}`}>
                            ${setup.resistanceLevel.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Setup Details</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {setup.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className={config.color}>•</span>
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/analysis?symbol=${setup.symbol}`);
                          }}
                          data-testid={`button-analyze-month-${setup.symbol}`}
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Full Analysis
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            createOrderMutation.mutate(setup);
                          }}
                          disabled={createOrderMutation.isPending}
                          data-testid={`button-trade-month-${setup.symbol}`}
                        >
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          {createOrderMutation.isPending ? 'Creating...' : 'Trade (Moomoo)'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : results ? (
        <Card className="p-8 text-center" data-testid="card-no-month-results">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Setups Found</h3>
          <p className="text-muted-foreground">
            No stocks currently match the monthly pattern criteria.
            Try again later as market conditions change.
          </p>
        </Card>
      ) : null}

      <StockChart
        symbol={chartSymbol}
        open={chartOpen}
        onOpenChange={setChartOpen}
        supportLevel={chartLevels.support}
        resistanceLevel={chartLevels.resistance}
        entryLevel={chartLevels.entry}
        stopLoss={chartLevels.stopLoss}
        targetPrice={chartLevels.target}
      />
    </div>
  );
}
