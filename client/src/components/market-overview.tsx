import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Minus, Settings, RefreshCw, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import type { MarketIndex, MarketPreferences } from "@shared/schema";

function IndexCard({ index }: { index: MarketIndex }) {
  const isPositive = index.change > 0;
  const isNeutral = index.change === 0;
  const safeSymbol = index.symbol.replace(/[^a-zA-Z0-9]/g, '');
  
  return (
    <Card className="p-4 hover-elevate transition-all" data-testid={`card-index-${safeSymbol}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono" data-testid={`badge-market-${safeSymbol}`}>
            {index.market}
          </Badge>
          <span className="text-xs text-muted-foreground" data-testid={`text-name-${safeSymbol}`}>{index.name}</span>
        </div>
        {isNeutral ? (
          <Minus className="w-4 h-4 text-muted-foreground" />
        ) : isPositive ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
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

  useEffect(() => {
    if (open) {
      setShowUS(preferences.showUSMarket);
      setShowSG(preferences.showSGMarket);
    }
  }, [open, preferences.showUSMarket, preferences.showSGMarket]);

  const handleSave = () => {
    onUpdate({ showUSMarket: showUS, showSGMarket: showSG });
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
        <div className="space-y-6 py-4">
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
          
          <Button onClick={handleSave} className="w-full" data-testid="button-save-market-settings">
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MarketOverview() {
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

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Market Overview</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {usIndices.map(index => (
              <IndexCard key={index.symbol} index={index} />
            ))}
          </div>
        </div>
      )}

      {sgIndices.length > 0 && (
        <div data-testid="section-sg-markets">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2" data-testid="heading-sg-markets">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            Singapore Markets
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {sgIndices.map(index => (
              <IndexCard key={index.symbol} index={index} />
            ))}
          </div>
        </div>
      )}

      {(!indices || indices.length === 0) && (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-no-markets">
          <p>No market data available. Enable markets in settings.</p>
        </div>
      )}
    </Card>
  );
}
