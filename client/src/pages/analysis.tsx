import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useStockQuote, useAnalyzeStock, useCreateTrade } from "@/hooks/use-stocks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnalysisResult } from "@/components/analysis-result";
import { Search, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalysisChart } from "@/components/analysis-chart";

const DEFAULT_SYMBOL = "NVDA";

export default function AnalysisPage() {
  const [location] = useLocation();
  const [search, setSearch] = useState(DEFAULT_SYMBOL);
  const { toast } = useToast();
  const hasAutoAnalyzed = useRef(false);
  
  // Parse query param for initial search, default to NVDA
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const symbol = params.get("symbol");
    if (symbol) {
      setSearch(symbol.toUpperCase());
    }
  }, []);

  const { data: quote, isError: isQuoteError, isLoading: isQuoteLoading } = useStockQuote(search);
  const analyzeMutation = useAnalyzeStock();
  const createTradeMutation = useCreateTrade();

  // Auto-analyze NVDA on first load
  useEffect(() => {
    if (!hasAutoAnalyzed.current && search && !analyzeMutation.data && !analyzeMutation.isPending) {
      hasAutoAnalyzed.current = true;
      analyzeMutation.mutate(search);
    }
  }, [search]);

  const handleAnalyze = () => {
    if (!search) return;
    analyzeMutation.mutate(search, {
      onError: (err) => {
        toast({
          title: "Analysis Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleApprove = () => {
    const analysis = analyzeMutation.data;
    if (!analysis) return;

    createTradeMutation.mutate({
      symbol: analysis.symbol,
      direction: analysis.recommendation === "BUY" ? "LONG" : "SHORT",
      entryPrice: analysis.entryPrice.toString(), // API expects number, but schema might cast
      takeProfit: analysis.takeProfit.toString(),
      stopLoss: analysis.stopLoss.toString(),
      rationale: analysis.rationale,
      status: "PENDING_APPROVAL",
    }, {
      onSuccess: () => {
        toast({
          title: "Trade Setup Created",
          description: `${analysis.symbol} has been sent for approval.`,
        });
        // Reset or redirect? let's keep them here to see result or analyze another
        analyzeMutation.reset();
        setSearch("");
      },
      onError: (err) => {
        toast({
          title: "Failed to Create Trade",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header with Quick Access Links */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-4xl md:text-5xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Symbol Analysis Chart
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Analyze stocks with interactive charts, trendlines, and support/resistance levels.
          </p>
        </div>
        
        {/* Quick Access Links - Always Visible */}
        <div className="flex items-center gap-2 justify-center md:justify-end">
          <Button 
            variant="outline" 
            size="sm"
            asChild
            data-testid="button-tradingview-analysis-header"
          >
            <a 
              href={`https://www.tradingview.com/chart/?symbol=${search || DEFAULT_SYMBOL}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              TradingView
            </a>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            asChild
            data-testid="button-moomoo-analysis-header"
          >
            <a 
              href="https://www.moomoo.com/trade"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Moomoo
            </a>
          </Button>
        </div>
      </div>

      <Card className="glass-panel p-2 flex items-center gap-2 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            className="pl-12 h-14 bg-transparent border-none text-lg focus-visible:ring-0 placeholder:text-muted-foreground/50"
            placeholder="Search stock symbol (e.g. NVDA)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value.toUpperCase());
              if (analyzeMutation.data) analyzeMutation.reset(); // Clear old analysis on type
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          />
        </div>
        {quote && (
           <div className="hidden md:flex flex-col items-end px-4 border-l border-white/10">
             <span className="font-mono font-bold">${quote.price.toFixed(2)}</span>
             <span className={`text-xs font-mono ${quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
               {quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
             </span>
           </div>
        )}
        <Button 
          size="lg" 
          className="h-14 px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-primary-foreground font-semibold"
          onClick={handleAnalyze}
          disabled={!search || analyzeMutation.isPending}
        >
          {analyzeMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Analyze <Sparkles className="ml-2 w-4 h-4" />
            </>
          )}
        </Button>
      </Card>

      {/* Quote Error State */}
      {isQuoteError && (
        <div className="text-center text-red-400 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
          Could not find quote for symbol "{search}". Please try again.
        </div>
      )}

      {/* Inline Chart with Trendlines and S/R */}
      {quote && (
        <AnalysisChart symbol={search} />
      )}

      {/* Analysis Results */}
      {analyzeMutation.data && (
        <AnalysisResult 
          analysis={analyzeMutation.data}
          onApprove={handleApprove}
          isPending={createTradeMutation.isPending}
        />
      )}
    </div>
  );
}
