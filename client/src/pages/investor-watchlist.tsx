import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Upload, Trash2, TrendingUp, TrendingDown, RefreshCw, Target, ArrowUp, ArrowDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InvestorTargetItem, StockQuote } from "@shared/schema";

type TargetItemWithQuote = InvestorTargetItem & {
  currentPrice?: number;
  valuationPercent?: number;
};

export default function InvestorWatchlist() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newIntrinsicValue, setNewIntrinsicValue] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quotesCache, setQuotesCache] = useState<Record<string, StockQuote>>({});

  const { data: targetList = [], isLoading } = useQuery<InvestorTargetItem[]>({
    queryKey: ["/api/investor-target-list"],
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: { symbol: string; intrinsicValue: string; notes?: string }) => {
      return apiRequest("POST", "/api/investor-target-list", { ...item, source: "USER_UPLOADED" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investor-target-list"] });
      toast({ title: "Stock added to target list" });
      setIsAddDialogOpen(false);
      setNewSymbol("");
      setNewIntrinsicValue("");
      setNewNotes("");
    },
    onError: () => {
      toast({ title: "Failed to add stock", variant: "destructive" });
    },
  });

  const bulkAddMutation = useMutation({
    mutationFn: async (items: { symbol: string; intrinsicValue: string; notes?: string }[]) => {
      return apiRequest("POST", "/api/investor-target-list/bulk", { 
        items: items.map(i => ({ ...i, source: "USER_UPLOADED" })) 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/investor-target-list"] });
      toast({ title: `${variables.length} stocks added to target list` });
    },
    onError: () => {
      toast({ title: "Failed to import stocks", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/investor-target-list/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investor-target-list"] });
      toast({ title: "Stock removed from target list" });
    },
    onError: () => {
      toast({ title: "Failed to remove stock", variant: "destructive" });
    },
  });

  const fetchQuotes = async () => {
    if (targetList.length === 0) return;
    
    setIsRefreshing(true);
    const newCache: Record<string, StockQuote> = {};
    
    for (const item of targetList) {
      try {
        const response = await fetch(`/api/stocks/quote/${item.symbol}`);
        if (response.ok) {
          const quote = await response.json();
          newCache[item.symbol] = quote;
        }
      } catch (error) {
        console.error(`Failed to fetch quote for ${item.symbol}`);
      }
    }
    
    setQuotesCache(newCache);
    setIsRefreshing(false);
  };

  const handleAddItem = () => {
    if (!newSymbol || !newIntrinsicValue) {
      toast({ title: "Please fill in symbol and intrinsic value", variant: "destructive" });
      return;
    }
    
    addItemMutation.mutate({
      symbol: newSymbol.toUpperCase(),
      intrinsicValue: newIntrinsicValue,
      notes: newNotes || undefined,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim());
        const items: { symbol: string; intrinsicValue: string; notes?: string }[] = [];

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",").map(p => p.trim());
          if (parts.length >= 2) {
            const symbol = parts[0].toUpperCase().replace(/"/g, "");
            const intrinsicValue = parts[1].replace(/"/g, "");
            const notes = parts[2]?.replace(/"/g, "") || undefined;
            
            if (symbol && intrinsicValue && !isNaN(parseFloat(intrinsicValue))) {
              items.push({ symbol, intrinsicValue, notes });
            }
          }
        }

        if (items.length > 0) {
          bulkAddMutation.mutate(items);
        } else {
          toast({ title: "No valid data found in file", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Failed to parse file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getItemsWithQuotes = (): TargetItemWithQuote[] => {
    return targetList.map(item => {
      const quote = quotesCache[item.symbol];
      const currentPrice = quote?.price;
      const intrinsic = parseFloat(item.intrinsicValue as string);
      
      let valuationPercent: number | undefined;
      if (currentPrice && intrinsic) {
        valuationPercent = ((intrinsic - currentPrice) / intrinsic) * 100;
      }
      
      return {
        ...item,
        currentPrice,
        valuationPercent,
      };
    });
  };

  const itemsWithQuotes = getItemsWithQuotes();
  const undervaluedCount = itemsWithQuotes.filter(i => i.valuationPercent && i.valuationPercent > 0).length;
  const overvaluedCount = itemsWithQuotes.filter(i => i.valuationPercent && i.valuationPercent < 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Investor Target List
          </h1>
          <p className="text-muted-foreground">
            Track stocks with your intrinsic values to find undervalued opportunities
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchQuotes} disabled={isRefreshing || targetList.length === 0} data-testid="button-refresh-prices">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Prices
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-upload-csv">
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-stock">
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Stock to Target List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Stock Symbol</Label>
                  <Input
                    id="symbol"
                    placeholder="e.g., AAPL"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    data-testid="input-symbol"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intrinsicValue">Your Intrinsic Value ($)</Label>
                  <Input
                    id="intrinsicValue"
                    type="number"
                    placeholder="e.g., 200.00"
                    value={newIntrinsicValue}
                    onChange={(e) => setNewIntrinsicValue(e.target.value)}
                    data-testid="input-intrinsic-value"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input
                    id="notes"
                    placeholder="e.g., DCF analysis"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    data-testid="input-notes"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddItem}
                  disabled={addItemMutation.isPending}
                  data-testid="button-confirm-add"
                >
                  {addItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add to Target List
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {targetList.length > 0 && Object.keys(quotesCache).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <ArrowDown className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{undervaluedCount}</p>
                  <p className="text-sm text-muted-foreground">Undervalued</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <ArrowUp className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overvaluedCount}</p>
                  <p className="text-sm text-muted-foreground">Overvalued</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{targetList.length}</p>
                  <p className="text-sm text-muted-foreground">Total Tracked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {targetList.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <Target className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">No stocks in your target list</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Add stocks with your calculated intrinsic values to track when they become undervalued buying opportunities.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-stock">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Stock
                </Button>
              </div>
              <div className="pt-4">
                <p className="text-xs text-muted-foreground">
                  CSV format: Symbol, Intrinsic Value, Notes (optional)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Target Stocks</CardTitle>
            <CardDescription>
              Click "Refresh Prices" to see current valuations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Intrinsic Value</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Valuation</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsWithQuotes.map((item) => (
                  <TableRow key={item.id} data-testid={`row-stock-${item.symbol}`}>
                    <TableCell className="font-medium">{item.symbol}</TableCell>
                    <TableCell className="text-right">
                      ${parseFloat(item.intrinsicValue as string).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.currentPrice ? (
                        `$${item.currentPrice.toFixed(2)}`
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.valuationPercent !== undefined ? (
                        <Badge 
                          variant={item.valuationPercent > 0 ? "default" : "destructive"}
                          className={item.valuationPercent > 0 ? "bg-green-500/20 text-green-600 hover:bg-green-500/30" : ""}
                        >
                          {item.valuationPercent > 0 ? (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          )}
                          {Math.abs(item.valuationPercent).toFixed(1)}%
                          {item.valuationPercent > 0 ? " under" : " over"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-32 truncate">
                      {item.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteItemMutation.mutate(item.id)}
                        disabled={deleteItemMutation.isPending}
                        data-testid={`button-delete-${item.symbol}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
