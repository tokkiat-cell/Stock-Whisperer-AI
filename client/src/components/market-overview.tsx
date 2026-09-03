import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Minus, Settings, RefreshCw, Globe, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import type { MarketIndex, MarketPreferences } from "@shared/schema";
import { StockChart } from "@/components/stock-chart";

function IndexCard({ index, onChartClick }: { index: MarketIndex; onChartClick?: (symbol: string) => void }) {
  const isPositive = index.change > 0;
  const isNeutral = index.change === 0;
  const safeSymbol = index.symbol.replace(/[^a-zA-Z0-9]/g, '');
  
  return (
    <Card 
      className="p-4 hover-elevate transition-all cursor-pointer" 
      data-testid={`card-index-${safeSymbol}`}
      onClick={() => onChartClick?.(index.symbol)}
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-xs font-mono shrink-0" data-testid={`badge-market-${safeSymbol}`}>
            {index.market}
          </Badge>
          <span className="text-xs text-muted-foreground truncate" data-testid={`text-name-${safeSymbol}`}>{index.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <LineChart className="w-4 h-4 text-primary" />
          {isNeutral ? (
            <Minus className="w-4 h-4 text-muted-foreground" />
          ) : isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono font-bold text-lg" data-testid={`text-price-${safeSymbol}`}>
            {index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground" data-testid={`text-prevclose-${safeSymbol}`}>
            Prev: {index.previousClose.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-right">
          <p className={cn(
            "font-mono text-sm font-semibold",
            isNeutral ? "text-muted-foreground" : isPositive ? "text-green-500" : "text-red-500"
          )} data-testid={`text-change-${safeSymbol}`}>
            {isPositive ? "+" : ""}{index.change.toFixed(2)}
          </p>
          <Badge 
            className={cn(
              "font-mono text-xs",
              isNeutral 
                ? "bg-muted text-muted-foreground" 
                : isPositive 
                  ? "bg-green-500/10 text-green-500" 
                  : "bg-red-500/10 text-red-500"
            )}
            data-testid={`badge-changepct-${safeSymbol}`}
          >
            {isPositive ? "+" : ""}{index.changePercent.toFixed(2)}%
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function MarketSettingsDialog({ preferences, onUpdate }: { 
  preferences: MarketPreferences; 
  onUpdate: (prefs: Partial<MarketPreferences>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showUS, setShowUS] = useState(preferences.showUSMarket);
  const [showSG, setShowSG] = useState(preferences.showSGMarket);
  const [showHK, setShowHK] = useState(preferences.showHKMarket);
  const [showCN, setShowCN] = useState(preferences.showCNMarket);
  const [showEU, setShowEU] = useState(preferences.showEUMarket);

  useEffect(() => {
    if (open) {
      setShowUS(preferences.showUSMarket);
      setShowSG(preferences.showSGMarket);
      setShowHK(preferences.showHKMarket);
      setShowCN(preferences.showCNMarket);
      setShowEU(preferences.showEUMarket);
    }
  }, [open, preferences.showUSMarket, preferences.showSGMarket, preferences.showHKMarket, preferences.showCNMarket, preferences.showEUMarket]);

  const handleSave = () => {
    onUpdate({ 
      showUSMarket: showUS, 
      showSGMarket: showSG,
      showHKMarket: showHK,
      showCNMarket: showCN,
      showEUMarket: showEU,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-market-settings">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Market Display Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium">US Markets</p>
                <p className="text-xs text-muted-foreground">S&P 500, Dow Jones, Nasdaq, Russell 2000</p>
              </div>
            </div>
            <Switch 
              checked={showUS} 
              onCheckedChange={setShowUS}
              data-testid="switch-us-market"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-medium">Singapore Markets</p>
                <p className="text-xs text-muted-foreground">STI, DBS, OCBC, UOB</p>
              </div>
            </div>
            <Switch 
              checked={showSG} 
              onCheckedChange={setShowSG}
              data-testid="switch-sg-market"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium">Hong Kong Markets</p>
                <p className="text-xs text-muted-foreground">Hang Seng, Tencent, Alibaba, AIA</p>
              </div>
            </div>
            <Switch 
              checked={showHK} 
              onCheckedChange={setShowHK}
              data-testid="switch-hk-market"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-medium">China Markets</p>
                <p className="text-xs text-muted-foreground">Shanghai Composite, CSI 300, Shenzhen</p>
              </div>
            </div>
            <Switch 
              checked={showCN} 
              onCheckedChange={setShowCN}
              data-testid="switch-cn-market"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-purple-500" />
              <div>
                <p className="font-medium">European Markets</p>
                <p className="text-xs text-muted-foreground">Euro Stoxx 50, FTSE, DAX, CAC 40</p>
              </div>
            </div>
            <Switch 
              checked={showEU} 
              onCheckedChange={setShowEU}
              data-testid="switch-eu-market"
            />
          </div>
          
          <Button onClick={handleSave} className="w-full" data-testid="button-save-market-settings">
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MarketOverview() {
  const [chartSymbol, setChartSymbol] = useState("");
  const [chartOpen, setChartOpen] = useState(false);

  const handleChartClick = (symbol: string) => {
    setChartSymbol(symbol);
    setChartOpen(true);
  };

  const { data: indices, isLoading, refetch, isFetching } = useQuery<MarketIndex[]>({
    queryKey: ['/api/market/indices'],
    refetchInterval: 60000,
  });

  const { data: preferences } = useQuery<MarketPreferences>({
    queryKey: ['/api/market/preferences'],
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<MarketPreferences>) => {
      return apiRequest('PUT', '/api/market/preferences', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/market/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/indices'] });
    },
  });

  const usIndices = indices?.filter(i => i.market === 'US') || [];
  const sgIndices = indices?.filter(i => i.market === 'SG') || [];
  const hkIndices = indices?.filter(i => i.market === 'HK') || [];
  const cnIndices = indices?.filter(i => i.market === 'CN') || [];
  const euIndices = indices?.filter(i => i.market === 'EU') || [];

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Market Overview</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="market-overview">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Market Overview</h2>
          {isFetching && (
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-markets"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          </Button>
          {preferences && (
            <MarketSettingsDialog 
              preferences={preferences} 
              onUpdate={(updates) => updatePreferences.mutate(updates)}
            />
          )}
        </div>
      </div>

      {usIndices.length > 0 && (
        <div className="mb-6" data-testid="section-us-markets">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2" data-testid="heading-us-markets">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            US Markets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {usIndices.map(index => (
              <IndexCard key={index.symbol} index={index} onChartClick={handleChartClick} />
            ))}
          </div>
        </div>
      )}

      {sgIndices.length > 0 && (
        <div className="mb-6" data-testid="section-sg-markets">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2" data-testid="heading-sg-markets">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            Singapore Markets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {sgIndices.map(index => (
              <IndexCard key={index.symbol} index={index} onChartClick={handleChartClick} />
            ))}
          </div>
        </div>
      )}

      {hkIndices.length > 0 && (
        <div className="mb-6" data-testid="section-hk-markets">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2" data-testid="heading-hk-markets">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Hong Kong Markets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {hkIndices.map(index => (
              <IndexCard key={index.symbol} index={index} onChartClick={handleChartClick} />
            ))}
          </div>
        </div>
      )}

      {cnIndices.length > 0 && (
        <div className="mb-6" data-testid="section-cn-markets">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2" data-testid="heading-cn-markets">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            China Markets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {cnIndices.map(index => (
              <IndexCard key={index.symbol} index={index} onChartClick={handleChartClick} />
            ))}
          </div>
        </div>
      )}

      {euIndices.length > 0 && (
        <div className="mb-6" data-testid="section-eu-markets">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2" data-testid="heading-eu-markets">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            European Markets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {euIndices.map(index => (
              <IndexCard key={index.symbol} index={index} onChartClick={handleChartClick} />
            ))}
          </div>
        </div>
      )}

      {(!indices || indices.length === 0) && (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-no-markets">
          <p>No market data available. Enable markets in settings.</p>
        </div>
      )}

      <StockChart
        symbol={chartSymbol}
        open={chartOpen}
        onOpenChange={setChartOpen}
      />
    </Card>
  );
}
