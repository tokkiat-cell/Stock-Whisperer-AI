import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Clock,
  BarChart3,
  Activity,
  Send,
  LineChart,
  Globe,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Search,
  X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { StockChart } from "@/components/stock-chart";

interface SearchResult {
  symbol: string;
  name: string;
}

interface SearchAnalysisResult {
  symbol: string;
  recommendation: "BUY" | "SELL" | "HOLD";
  entryPrice: string;
  takeProfit: string;
  stopLoss: string;
  riskReward: string;
  rationale: string;
  confidence?: number;
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
  technicalAnalysis?: {
    trend: string;
    candlePattern: string;
    rsi: string;
    macd: string;
    movingAverages: {
      ma20: string;
      ma50: string;
      ma200: string;
    };
  };
}

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
  momentumScore?: number;
  volatilityPercent?: number;
  rsiValue?: number;
  macdSignal?: "BULLISH" | "BEARISH" | "NEUTRAL";
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

// Currency configuration for each market
const marketCurrency: Record<MarketType, { symbol: string; code: string; toUSD: number }> = {
  US: { symbol: "$", code: "USD", toUSD: 1 },
  SG: { symbol: "S$", code: "SGD", toUSD: 0.74 },
  HK: { symbol: "HK$", code: "HKD", toUSD: 0.128 },
  CN: { symbol: "¥", code: "CNY", toUSD: 0.14 },
  EU: { symbol: "€", code: "EUR", toUSD: 1.08 }
};

export default function MarketScan() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [isScanning, setIsScanning] = useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("day");
  const [selectedMarket, setSelectedMarket] = useState<MarketType>("US");
  const [chartOpen, setChartOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("");
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);
  
  // Stock search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchAnalysis, setSearchAnalysis] = useState<SearchAnalysisResult | null>(null);
  const [expandedSearchResult, setExpandedSearchResult] = useState(true);
  const [searchTimeframe, setSearchTimeframe] = useState<Timeframe | "">("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search for stock symbols
  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    
    const debounce = setTimeout(async () => {
      try {
        const response = await fetch(`/api/stocks/search?query=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const results = await response.json();
          setSearchResults(results.slice(0, 8));
          setShowSearchDropdown(true);
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }, 300);
    
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Analyze a specific stock
  const analyzeStockMutation = useMutation({
    mutationFn: async (symbol: string) => {
      if (!searchTimeframe) {
        throw new Error("Please select a timeframe first");
      }
      const response = await apiRequest("POST", "/api/analysis/analyze", { symbol, timeframe: searchTimeframe });
      return response.json();
    },
    onSuccess: (data) => {
      setSearchAnalysis(data);
      setSearchQuery("");
      setShowSearchDropdown(false);
      toast({
        title: "Analysis Complete",
        description: `Detailed analysis for ${data.symbol} is ready.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not analyze this stock. Please try again.",
      });
    },
  });

  const handleSearchSelect = (symbol: string) => {
    // Only populate the search field - user must select timeframe and click Analyze
    setSearchQuery(symbol);
    setShowSearchDropdown(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && searchTimeframe) {
      analyzeStockMutation.mutate(searchQuery.trim().toUpperCase());
    }
  };

  const clearSearchAnalysis = () => {
    setSearchAnalysis(null);
    setSearchQuery("");
    setSearchTimeframe("");
    // Clear the URL parameter when clearing the analysis
    setLocation("/scan", { replace: true });
  };

  // Clear stale analysis when timeframe changes (user must click Analyze again)
  const previousTimeframeRef = useRef<Timeframe | "">(searchTimeframe);
  useEffect(() => {
    // If timeframe changed and there's an existing analysis, clear it
    // This prevents showing stale recommendations based on wrong timeframe
    if (
      previousTimeframeRef.current !== searchTimeframe &&
      previousTimeframeRef.current !== "" &&
      searchAnalysis
    ) {
      // Keep the symbol in searchQuery so user just needs to click Analyze
      setSearchQuery(searchAnalysis.symbol);
      setSearchAnalysis(null);
      toast({
        title: "Timeframe Changed",
        description: `Click Analyze to see ${searchAnalysis.symbol} recommendations for ${timeframeLabels[searchTimeframe as Timeframe] || searchTimeframe}.`,
      });
    }
    previousTimeframeRef.current = searchTimeframe;
  }, [searchTimeframe, searchAnalysis, toast]);

  // Handle URL parameter for symbol (e.g., /scan?symbol=AAPL)
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlSymbol = params.get("symbol");
    
    // Only populate the search query from URL - user must select timeframe before analysis triggers
    if (urlSymbol) {
      const upperSymbol = urlSymbol.toUpperCase();
      // If we already have an analysis for this exact symbol, don't re-populate
      if (searchAnalysis?.symbol === upperSymbol) return;
      
      // Just populate the search field - user needs to select timeframe and click analyze
      setSearchQuery(upperSymbol);
    }
  }, [searchString]);

  const formatRecommendationForShare = (rec: Recommendation) => {
    const currency = marketCurrency[selectedMarket];
    let text = `Stock Whisperer.AI Scanner\n`;
    text += `$${rec.symbol} - ${rec.recommendation}\n`;
    text += `Timeframe: ${timeframeLabels[timeframe]}\n\n`;
    
    text += `KEY LEVELS\n`;
    text += `Entry: ${currency.symbol}${rec.entryPrice}\n`;
    text += `Take Profit: ${currency.symbol}${rec.takeProfit}\n`;
    text += `Stop Loss: ${currency.symbol}${rec.stopLoss}\n`;
    text += `Risk/Reward: ${rec.riskReward}\n`;
    
    if (rec.movingAverages) {
      text += `\nMOVING AVERAGES\n`;
      Object.entries(rec.movingAverages).forEach(([key, value]) => {
        text += `${key.toUpperCase()}: $${value} | `;
      });
      text = text.slice(0, -3) + '\n';
    }
    
    if (rec.candlePattern) {
      text += `\nPATTERN: ${rec.candlePattern}\n`;
    }
    
    if (rec.supportResistance) {
      text += `\nSUPPORT & RESISTANCE\n`;
      text += `Support 1: $${rec.supportResistance.support1} | Support 2: $${rec.supportResistance.support2}\n`;
      text += `Resistance 1: $${rec.supportResistance.resistance1} | Resistance 2: $${rec.supportResistance.resistance2}\n`;
    }
    
    if (rec.optionsStrategy) {
      text += `\nOPTIONS STRATEGY\n`;
      text += `Strategy: ${rec.optionsStrategy.strategy}\n`;
      text += `Strike: $${rec.optionsStrategy.strikePrice} | Target: $${rec.optionsStrategy.targetStrike}\n`;
      text += `Expiry: ${rec.optionsStrategy.expiry}\n`;
      text += `Max Profit: ${rec.optionsStrategy.maxProfit} | Max Risk: ${rec.optionsStrategy.maxRisk}\n`;
    }
    
    if (rec.rationale) {
      text += `\nRATIONALE\n${rec.rationale}\n`;
    }
    
    text += `\n---\nGenerated by Stock Whisperer.AI`;
    return text;
  };

  const handleShareRecommendation = async (rec: Recommendation) => {
    const shareText = formatRecommendationForShare(rec);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${rec.symbol} - Stock Whisperer.AI`,
          text: shareText,
        });
        return;
      } catch (err) {
        // Fall back to clipboard
      }
    }
    
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedSymbol(rec.symbol);
      toast({
        title: "Copied to clipboard",
        description: "Recommendation details have been copied. You can now paste and share.",
      });
      setTimeout(() => setCopiedSymbol(null), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format search analysis for sharing
  const formatSearchAnalysisForShare = () => {
    if (!searchAnalysis) return "";
    
    let text = `Stock Whisperer.AI Analysis\n`;
    text += `$${searchAnalysis.symbol} - ${searchAnalysis.recommendation}\n`;
    text += `Timeframe: ${searchTimeframe ? timeframeLabels[searchTimeframe] : "N/A"}\n\n`;
    
    text += `KEY LEVELS\n`;
    text += `Entry: $${searchAnalysis.entryPrice}\n`;
    text += `Take Profit: $${searchAnalysis.takeProfit}\n`;
    text += `Stop Loss: $${searchAnalysis.stopLoss}\n`;
    text += `Risk/Reward: ${searchAnalysis.riskReward}\n`;
    
    if (searchAnalysis.confidence) {
      text += `Confidence: ${searchAnalysis.confidence}%\n`;
    }
    
    if (searchAnalysis.rationale) {
      text += `\nRATIONALE\n${searchAnalysis.rationale}\n`;
    }
    
    text += `\n---\nGenerated by Stock Whisperer.AI`;
    return text;
  };

  const handleShareSearchAnalysis = async () => {
    const shareText = formatSearchAnalysisForShare();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${searchAnalysis?.symbol} - Stock Whisperer.AI`,
          text: shareText,
        });
        return;
      } catch (err) {
        // Fall back to clipboard
      }
    }
    
    try {
      await navigator.clipboard.writeText(shareText);
      if (searchAnalysis) {
        setCopiedSymbol(searchAnalysis.symbol);
      }
      toast({
        title: "Copied to clipboard",
        description: "Analysis details have been copied. You can now paste and share.",
      });
      setTimeout(() => setCopiedSymbol(null), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openChart = (symbol: string) => {
    setChartSymbol(symbol);
    setChartOpen(true);
  };

  const createOrderMutation = useMutation({
    mutationFn: async (rec: Recommendation) => {
      return apiRequest("POST", "/api/trading-orders", {
        symbol: rec.symbol,
        action: rec.recommendation === "BUY" ? "BUY" : "SELL",
        orderType: "LIMIT",
        quantity: 10,
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
    refetchOnMount: "always",
    staleTime: 0,
  });

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await apiRequest("POST", "/api/sp500/scan", {
        timeframe: timeframe,
        market: selectedMarket
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sp500/recommendations"] });
      toast({
        title: "Scan Complete",
        description: `Generated trade recommendations for ${marketLabels[selectedMarket]}.`,
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Scan className="w-6 h-6 text-primary" />
            AI Market Scanner
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Generate trade recommendations with AI-powered multi-source analysis
          </p>
        </div>
        
        {/* Quick Access Links */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            asChild
            data-testid="button-tradingview-header"
          >
            <a 
              href="https://www.tradingview.com/chart/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              TradingView
            </a>
          </Button>
        </div>
      </div>

      {/* Stock Search */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          Search Stock
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Search for any stock symbol to get a detailed AI analysis report
        </p>
        
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stock Symbol Input */}
            <div className="relative md:col-span-1">
              <Label className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                Stock Symbol
              </Label>
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="e.g., AAPL, MSFT"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-stock-search"
                />
                {/* Search Autocomplete Dropdown */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.symbol}
                        type="button"
                        onClick={() => handleSearchSelect(result.symbol)}
                        className="w-full px-4 py-2 text-left hover-elevate flex items-center justify-between gap-2"
                        data-testid={`search-result-${result.symbol}`}
                      >
                        <span className="font-medium">{result.symbol}</span>
                        <span className="text-sm text-muted-foreground truncate">{result.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Timeframe Selection */}
            <div className="md:col-span-1">
              <Label className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Trading Timeframe
              </Label>
              <Select value={searchTimeframe} onValueChange={(v) => setSearchTimeframe(v as Timeframe)}>
                <SelectTrigger data-testid="select-search-timeframe">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Trading (Intraday)</SelectItem>
                  <SelectItem value="month">Monthly Trade (1-4 weeks)</SelectItem>
                  <SelectItem value="swing">Swing Trade (3-9 months)</SelectItem>
                  <SelectItem value="longterm">Long-term Investment (1+ year)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Analyze Button */}
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={analyzeStockMutation.isPending || !searchQuery.trim() || !searchTimeframe}
                data-testid="button-search-stock"
              >
                {analyzeStockMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 mr-2" />
                    Analyze Stock
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Search Analysis Result */}
      {searchAnalysis && (
        <Card className={cn(
          "p-6",
          searchAnalysis.recommendation === "HOLD" 
            ? "bg-yellow-500/10" 
            : searchAnalysis.recommendation === "BUY" 
              ? "bg-green-500/10" 
              : "bg-red-500/10"
        )}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => openChart(searchAnalysis.symbol)}
                className="text-2xl font-bold hover:text-primary transition-colors cursor-pointer"
                data-testid={`button-chart-${searchAnalysis.symbol}`}
              >
                ${searchAnalysis.symbol}
              </button>
              <Badge 
                variant={searchAnalysis.recommendation === "HOLD" ? "secondary" : searchAnalysis.recommendation === "BUY" ? "default" : "destructive"}
                className={cn("text-sm font-bold px-3 py-1", 
                  searchAnalysis.recommendation === "BUY" ? "bg-green-500" : 
                  searchAnalysis.recommendation === "HOLD" ? "bg-yellow-500" :
                  "bg-red-500"
                )}
              >
                {searchAnalysis.recommendation === "BUY" ? <TrendingUp className="w-4 h-4 mr-1" /> : 
                 searchAnalysis.recommendation === "HOLD" ? <Activity className="w-4 h-4 mr-1" /> :
                 <TrendingDown className="w-4 h-4 mr-1" />}
                {searchAnalysis.recommendation}
              </Badge>
              {searchAnalysis.confidence && (
                <Badge variant="outline" className="text-sm">
                  {searchAnalysis.confidence}% Confidence
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openChart(searchAnalysis.symbol)}
                data-testid="button-search-chart"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShareSearchAnalysis}
                data-testid="button-share-search-analysis"
              >
                {copiedSymbol === searchAnalysis.symbol ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSearchAnalysis}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Key Levels Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-background/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Target className="w-3 h-3" />
                Entry Price
              </div>
              <p className="font-semibold">${searchAnalysis.entryPrice}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-500 text-xs mb-1">
                <TrendingUp className="w-3 h-3" />
                Take Profit
              </div>
              <p className="font-semibold text-green-500">${searchAnalysis.takeProfit}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-500 text-xs mb-1">
                <ShieldAlert className="w-3 h-3" />
                Stop Loss
              </div>
              <p className="font-semibold text-red-500">${searchAnalysis.stopLoss}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Scale className="w-3 h-3" />
                Risk/Reward
              </div>
              <p className="font-semibold">{searchAnalysis.riskReward}</p>
            </div>
          </div>

          {/* Rationale */}
          <div className="bg-background/50 rounded-lg p-4 mb-4">
            <h4 className="font-medium mb-2">AI Rationale</h4>
            <p className="text-sm text-muted-foreground">{searchAnalysis.rationale}</p>
          </div>

          {/* Expand/Collapse Technical Details */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedSearchResult(!expandedSearchResult)}
              data-testid="button-expand-search-result"
            >
              {expandedSearchResult ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show Details
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              asChild
              data-testid="button-tradingview-search"
            >
              <a 
                href={`https://www.tradingview.com/chart/?symbol=${searchAnalysis.symbol}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>

          {/* Expanded Technical Analysis */}
          {expandedSearchResult && (
            <div className="mt-4 space-y-4">
              {/* Technical Analysis */}
              {searchAnalysis.technicalAnalysis && (
                <div className="bg-background/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Technical Analysis
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Trend</span>
                      <p className="font-medium">{searchAnalysis.technicalAnalysis.trend}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Pattern</span>
                      <p className="font-medium">{searchAnalysis.technicalAnalysis.candlePattern}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">RSI</span>
                      <p className="font-medium">{searchAnalysis.technicalAnalysis.rsi}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">MACD</span>
                      <p className="font-medium">{searchAnalysis.technicalAnalysis.macd}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Moving Averages */}
              {searchAnalysis.movingAverages && (
                <div className="bg-background/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-primary" />
                    Moving Averages
                  </h4>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {Object.entries(searchAnalysis.movingAverages).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-xs text-muted-foreground">{key.toUpperCase()}</span>
                        <p className="font-medium">${value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Support & Resistance */}
              {searchAnalysis.supportResistance && (
                <div className="bg-background/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Support & Resistance</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <span className="text-xs text-green-500">Support 1</span>
                      <p className="font-medium">${searchAnalysis.supportResistance.support1}</p>
                    </div>
                    <div>
                      <span className="text-xs text-green-500">Support 2</span>
                      <p className="font-medium">${searchAnalysis.supportResistance.support2}</p>
                    </div>
                    <div>
                      <span className="text-xs text-red-500">Resistance 1</span>
                      <p className="font-medium">${searchAnalysis.supportResistance.resistance1}</p>
                    </div>
                    <div>
                      <span className="text-xs text-red-500">Resistance 2</span>
                      <p className="font-medium">${searchAnalysis.supportResistance.resistance2}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Options Strategy */}
              {searchAnalysis.optionsStrategy && (
                <div className="bg-background/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Options Strategy</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-primary">{searchAnalysis.optionsStrategy.strategy}</span>
                      <Badge variant="outline">{searchAnalysis.optionsStrategy.expiry}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{searchAnalysis.optionsStrategy.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Strike Price</span>
                        <p className="font-medium">${searchAnalysis.optionsStrategy.strikePrice}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Target Strike</span>
                        <p className="font-medium">${searchAnalysis.optionsStrategy.targetStrike}</p>
                      </div>
                      <div>
                        <span className="text-xs text-green-500">Max Profit</span>
                        <p className="font-medium text-green-500">{searchAnalysis.optionsStrategy.maxProfit}</p>
                      </div>
                      <div>
                        <span className="text-xs text-red-500">Max Risk</span>
                        <p className="font-medium text-red-500">{searchAnalysis.optionsStrategy.maxRisk}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Scan Configuration */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Scan Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              Select your target market region
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
              Top 10 Trade Recommendations
            </h3>
            <span className="text-xs text-muted-foreground">
              Based on technical analysis and market conditions
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {recommendations.slice(0, 10).map((rec, idx) => (
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
                        {(rec.momentumScore !== undefined || rec.volatilityPercent !== undefined || rec.rsiValue !== undefined) && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {rec.momentumScore !== undefined && (
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                rec.momentumScore > 0.5 ? "border-green-500/50 text-green-500" : 
                                rec.momentumScore < -0.5 ? "border-red-500/50 text-red-500" : "border-muted"
                              )}>
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Momentum: {rec.momentumScore > 0 ? "+" : ""}{(rec.momentumScore * 100).toFixed(0)}%
                              </Badge>
                            )}
                            {rec.volatilityPercent !== undefined && (
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                rec.volatilityPercent > 5 ? "border-orange-500/50 text-orange-500" : "border-muted"
                              )}>
                                <Activity className="w-3 h-3 mr-1" />
                                Vol: {rec.volatilityPercent.toFixed(1)}%
                              </Badge>
                            )}
                            {rec.rsiValue !== undefined && (
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                rec.rsiValue > 70 ? "border-red-500/50 text-red-500" :
                                rec.rsiValue < 30 ? "border-green-500/50 text-green-500" : "border-muted"
                              )}>
                                RSI: {rec.rsiValue.toFixed(0)}
                              </Badge>
                            )}
                            {rec.macdSignal && (
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                rec.macdSignal === "BULLISH" ? "border-green-500/50 text-green-500" :
                                rec.macdSignal === "BEARISH" ? "border-red-500/50 text-red-500" : "border-muted"
                              )}>
                                MACD: {rec.macdSignal}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Entry
                        </p>
                        <p className="text-lg font-mono font-bold">
                          {marketCurrency[selectedMarket].symbol}{rec.entryPrice}
                        </p>
                        {selectedMarket !== "US" && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            ≈ ${(parseFloat(rec.entryPrice) * marketCurrency[selectedMarket].toUSD).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Target className="w-3 h-3" /> Target
                        </p>
                        <p className="text-lg font-mono font-bold text-green-500">
                          {marketCurrency[selectedMarket].symbol}{rec.takeProfit}
                        </p>
                        {selectedMarket !== "US" && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            ≈ ${(parseFloat(rec.takeProfit) * marketCurrency[selectedMarket].toUSD).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Stop Loss
                        </p>
                        <p className="text-lg font-mono font-bold text-red-500">
                          {marketCurrency[selectedMarket].symbol}{rec.stopLoss}
                        </p>
                        {selectedMarket !== "US" && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            ≈ ${(parseFloat(rec.stopLoss) * marketCurrency[selectedMarket].toUSD).toFixed(2)}
                          </p>
                        )}
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
                        variant="outline"
                        size="icon"
                        onClick={() => handleShareRecommendation(rec)}
                        data-testid={`button-share-${rec.symbol}`}
                      >
                        {copiedSymbol === rec.symbol ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
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

                      {/* External Links & Chart Analysis */}
                      <div className="pt-4 border-t space-y-3">
                        <Button 
                          variant="outline" 
                          onClick={() => openChart(rec.symbol)}
                          className="w-full"
                          data-testid={`button-deep-analysis-${rec.symbol}`}
                        >
                          <LineChart className="w-4 h-4 mr-2" />
                          View Full Chart Analysis
                        </Button>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Button 
                            variant="outline" 
                            asChild
                            className="w-full"
                            data-testid={`button-tradingview-${rec.symbol}`}
                          >
                            <a 
                              href={`https://www.tradingview.com/chart/?symbol=${rec.symbol}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              TradingView
                            </a>
                          </Button>
                        </div>
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
