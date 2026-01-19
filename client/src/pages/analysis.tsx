import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useStockQuote, useAnalyzeStock, useCreateTrade } from "@/hooks/use-stocks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnalysisResult } from "@/components/analysis-result";
import { Search, Sparkles, ArrowRight, Loader2, LineChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StockChart } from "@/components/stock-chart";

export default function AnalysisPage() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const [chartOpen, setChartOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("");

  const openChart = (symbol: string) => {
    setChartSymbol(symbol);
    setChartOpen(true);
  };
  
  // Parse query param for initial search
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const symbol = params.get("symbol");
    if (symbol) {
      setSearch(symbol);
    }
  }, []);

  const { data: quote, isError: isQuoteError, isLoading: isQuoteLoading } = useStockQuote(search);
  const analyzeMutation = useAnalyzeStock();
  const createTradeMutation = useCreateTrade();

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
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
          AI Market Analysis
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Enter a ticker symbol to get real-time price data and detailed AI-powered trading recommendations.
        </p>
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

      {/* View Chart Button */}
      {quote && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => openChart(search)}
            data-testid="button-view-chart"
          >
            <LineChart className="w-4 h-4 mr-2" />
            View Chart
          </Button>
        </div>
      )}

      {/* Analysis Results */}
      {analyzeMutation.data && (
        <AnalysisResult 
          analysis={analyzeMutation.data}
          onApprove={handleApprove}
          isPending={createTradeMutation.isPending}
        />
      )}

      <StockChart
        symbol={chartSymbol}
        open={chartOpen}
        onOpenChange={setChartOpen}
      />
    </div>
  );
}
