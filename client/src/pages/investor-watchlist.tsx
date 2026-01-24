import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Upload, Trash2, TrendingUp, TrendingDown, RefreshCw, Target, ArrowUp, ArrowDown, Filter, ArrowUpDown, ChevronDown } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMoat, setFilterMoat] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("symbol");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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
    mutationFn: async (items: { 
      symbol: string; 
      intrinsicValue: string; 
      companyName?: string;
      adamList?: string;
      currency?: string;
      supportLevel1?: string;
      supportLevel2?: string;
      supportLevel3?: string;
      supportLevel4?: string;
      supportLevel5?: string;
      conservativeIV?: string;
      baseIV?: string;
      averageIV?: string;
      discountPremium?: string;
      growthRates?: string;
      moat?: string;
      investmentType?: string;
      notes?: string;
    }[]) => {
      return apiRequest("POST", "/api/investor-target-list/bulk", { 
        items: items.map(i => ({ ...i, source: "USER_UPLOADED" })) 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/investor-target-list"] });
      toast({ title: `${variables.length} stocks added to growth stocklist` });
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

  const stripExchangePrefix = (symbol: string): string => {
    const prefixes = ['NASDAQ:', 'NYSE:', 'AMEX:', 'ARCA:', 'BATS:', 'OTC:', 'SGX:', 'HKEX:', 'SSE:', 'SZSE:', 'LSE:', 'XETR:', 'EURONEXT:'];
    let cleanSymbol = symbol.toUpperCase().replace(/"/g, "").trim();
    for (const prefix of prefixes) {
      if (cleanSymbol.startsWith(prefix)) {
        cleanSymbol = cleanSymbol.substring(prefix.length);
        break;
      }
    }
    return cleanSymbol;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim());
        const items: { 
          symbol: string; 
          intrinsicValue: string; 
          companyName?: string;
          adamList?: string;
          currency?: string;
          supportLevel1?: string;
          supportLevel2?: string;
          supportLevel3?: string;
          supportLevel4?: string;
          supportLevel5?: string;
          conservativeIV?: string;
          baseIV?: string;
          averageIV?: string;
          discountPremium?: string;
          growthRates?: string;
          moat?: string;
          investmentType?: string;
          notes?: string;
        }[] = [];

        if (lines.length < 1) {
          toast({ title: "File is empty", variant: "destructive" });
          return;
        }

        const headerLine = lines[0].toLowerCase();
        const isTabSeparated = headerLine.includes("\t");
        const separator = isTabSeparated ? "\t" : ",";
        
        const headers = lines[0].split(separator).map(h => h.toLowerCase().replace(/"/g, "").trim());
        
        const isAdamFormat = headers.includes("adam list") || headers.some(h => h.includes("adam"));
        const isTradingViewFormat = headers.includes("symbol") && 
          (headers.includes("description") || headers.includes("name")) &&
          !headers.some(h => h.includes("intrinsic") || h.includes("value") || h.includes("target"));
        
        const adamListIdx = headers.findIndex(h => h.includes("adam"));
        const symbolIdx = headers.findIndex(h => h === "symbol" || h === "ticker");
        const companyIdx = headers.findIndex(h => h === "company" || h === "name");
        const currencyIdx = headers.findIndex(h => h === "currency");
        const support1Idx = headers.findIndex(h => h.includes("support level 1") || h.includes("support 1"));
        const support2Idx = headers.findIndex(h => h.includes("support level 2") || h.includes("support 2"));
        const support3Idx = headers.findIndex(h => h.includes("support level 3") || h.includes("support 3"));
        const support4Idx = headers.findIndex(h => h.includes("support level 4") || h.includes("support 4"));
        const support5Idx = headers.findIndex(h => h.includes("support level 5") || h.includes("support 5"));
        const conservativeIVIdx = headers.findIndex(h => h.includes("conservative"));
        const baseIVIdx = headers.findIndex(h => h.includes("base iv"));
        const averageIVIdx = headers.findIndex(h => h.includes("average iv"));
        const discountIdx = headers.findIndex(h => h.includes("discount") || h.includes("premium"));
        const growthIdx = headers.findIndex(h => h.includes("growth"));
        const moatIdx = headers.findIndex(h => h === "moat");
        const investmentTypeIdx = headers.findIndex(h => h.includes("investment type"));
        const intrinsicIdx = headers.findIndex(h => h.includes("intrinsic") || h === "value" || h === "target");
        const descIdx = headers.findIndex(h => h === "description" || h === "notes");

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(separator).map(p => p.trim().replace(/"/g, ""));
          
          if (parts.length < 2 || !parts[1]) continue;
          
          const parseNum = (idx: number): string | undefined => {
            if (idx < 0) return undefined;
            const val = parts[idx]?.replace(/[^0-9.\-]/g, "");
            return val && !isNaN(parseFloat(val)) ? val : undefined;
          };

          if (isAdamFormat) {
            const symbol = stripExchangePrefix(symbolIdx >= 0 ? parts[symbolIdx] : parts[1]);
            if (!symbol || symbol.length === 0 || symbol.length > 20) continue;
            
            const avgIV = parseNum(averageIVIdx);
            const baseIV = parseNum(baseIVIdx);
            const conservIV = parseNum(conservativeIVIdx);
            const intrinsicValue = avgIV || baseIV || conservIV || "0";
            
            items.push({
              symbol,
              intrinsicValue,
              companyName: companyIdx >= 0 ? parts[companyIdx] : undefined,
              adamList: adamListIdx >= 0 ? parts[adamListIdx] : undefined,
              currency: currencyIdx >= 0 ? parts[currencyIdx] : undefined,
              supportLevel1: parseNum(support1Idx),
              supportLevel2: parseNum(support2Idx),
              supportLevel3: parseNum(support3Idx),
              supportLevel4: parseNum(support4Idx),
              supportLevel5: parseNum(support5Idx),
              conservativeIV: conservIV,
              baseIV: baseIV,
              averageIV: avgIV,
              discountPremium: discountIdx >= 0 ? parts[discountIdx] : undefined,
              growthRates: growthIdx >= 0 ? parts[growthIdx] : undefined,
              moat: moatIdx >= 0 ? parts[moatIdx] : undefined,
              investmentType: investmentTypeIdx >= 0 ? parts[investmentTypeIdx] : undefined,
            });
          } else if (isTradingViewFormat) {
            const symbol = stripExchangePrefix(symbolIdx >= 0 ? parts[symbolIdx] : parts[0]);
            if (!symbol || symbol.length === 0 || symbol.length > 20) continue;
            
            items.push({ 
              symbol, 
              intrinsicValue: "0", 
              notes: descIdx >= 0 ? parts[descIdx] : undefined 
            });
          } else {
            const symbol = stripExchangePrefix(symbolIdx >= 0 ? parts[symbolIdx] : parts[0]);
            if (!symbol || symbol.length === 0 || symbol.length > 20) continue;
            
            let intrinsicValue = intrinsicIdx >= 0 ? parseNum(intrinsicIdx) : parseNum(1);
            if (!intrinsicValue) intrinsicValue = "0";
            
            const notesIdx = descIdx >= 0 ? descIdx : (intrinsicIdx >= 0 ? intrinsicIdx + 1 : 2);
            
            items.push({ symbol, intrinsicValue, notes: parts[notesIdx] || undefined });
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
    let items = targetList.map(item => {
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

    if (filterCategory !== "all") {
      items = items.filter(i => i.adamList?.toLowerCase() === filterCategory.toLowerCase());
    }
    if (filterMoat !== "all") {
      items = items.filter(i => i.moat?.toLowerCase() === filterMoat.toLowerCase());
    }

    items.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "symbol":
          aVal = a.symbol || "";
          bVal = b.symbol || "";
          break;
        case "intrinsicValue":
          aVal = parseFloat(a.intrinsicValue as string) || 0;
          bVal = parseFloat(b.intrinsicValue as string) || 0;
          break;
        case "currentPrice":
          aVal = a.currentPrice || 0;
          bVal = b.currentPrice || 0;
          break;
        case "valuation":
          aVal = a.valuationPercent || -999;
          bVal = b.valuationPercent || -999;
          break;
        case "growthRates":
          aVal = parseFloat(a.growthRates?.replace("%", "") || "0") || 0;
          bVal = parseFloat(b.growthRates?.replace("%", "") || "0") || 0;
          break;
        case "moat":
          aVal = a.moat || "";
          bVal = b.moat || "";
          break;
        default:
          aVal = a.symbol || "";
          bVal = b.symbol || "";
      }
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return items;
  };

  const allItems = targetList.map(item => {
    const quote = quotesCache[item.symbol];
    const currentPrice = quote?.price;
    const intrinsic = parseFloat(item.intrinsicValue as string);
    let valuationPercent: number | undefined;
    if (currentPrice && intrinsic) {
      valuationPercent = ((intrinsic - currentPrice) / intrinsic) * 100;
    }
    return { ...item, currentPrice, valuationPercent };
  });

  const itemsWithQuotes = getItemsWithQuotes();
  const undervaluedCount = allItems.filter(i => i.valuationPercent && i.valuationPercent > 0).length;
  const overvaluedCount = allItems.filter(i => i.valuationPercent && i.valuationPercent < 0).length;

  const categories = Array.from(new Set(targetList.map(i => i.adamList).filter(Boolean))) as string[];
  const moats = Array.from(new Set(targetList.map(i => i.moat).filter(Boolean))) as string[];

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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
            Growth Stocklist
          </h1>
          <p className="text-muted-foreground">
            Track growth stocks with intrinsic values, support levels, moat ratings, and growth rates
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
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Your Growth Stocklist</CardTitle>
                <CardDescription>
                  Click "Refresh Prices" to see current valuations
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {categories.length > 0 && (
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-32" data-testid="select-filter-category">
                      <Filter className="h-4 w-4 mr-1" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat?.toLowerCase() || ""}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {moats.length > 0 && (
                  <Select value={filterMoat} onValueChange={setFilterMoat}>
                    <SelectTrigger className="w-28" data-testid="select-filter-moat">
                      <Filter className="h-4 w-4 mr-1" />
                      <SelectValue placeholder="Moat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Moats</SelectItem>
                      {moats.map(m => (
                        <SelectItem key={m} value={m?.toLowerCase() || ""}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-sort">
                      <ArrowUpDown className="h-4 w-4 mr-1" />
                      Sort
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => toggleSort("symbol")}>
                      Symbol {sortField === "symbol" && (sortDirection === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("valuation")}>
                      Valuation {sortField === "valuation" && (sortDirection === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("growthRates")}>
                      Growth Rate {sortField === "growthRates" && (sortDirection === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("moat")}>
                      Moat {sortField === "moat" && (sortDirection === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("intrinsicValue")}>
                      Intrinsic Value {sortField === "intrinsicValue" && (sortDirection === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Category</TableHead>
                    <TableHead className="min-w-[100px]">Symbol</TableHead>
                    <TableHead className="min-w-[150px]">Company</TableHead>
                    <TableHead className="text-right min-w-[80px]">Price</TableHead>
                    <TableHead className="text-right min-w-[80px]">Avg IV</TableHead>
                    <TableHead className="text-right min-w-[100px]">Discount</TableHead>
                    <TableHead className="min-w-[80px]">Growth</TableHead>
                    <TableHead className="min-w-[70px]">Moat</TableHead>
                    <TableHead className="min-w-[120px]">Type</TableHead>
                    <TableHead className="text-right min-w-[80px]">Support 1</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsWithQuotes.map((item) => (
                    <TableRow key={item.id} data-testid={`row-stock-${item.symbol}`}>
                      <TableCell>
                        {item.adamList && (
                          <Badge variant="outline" className="text-xs">
                            {item.adamList}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.symbol}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {item.companyName || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.currentPrice ? (
                          `$${item.currentPrice.toFixed(2)}`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(item.intrinsicValue as string) > 0 
                          ? `$${parseFloat(item.intrinsicValue as string).toFixed(2)}`
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {item.discountPremium ? (
                          <Badge 
                            variant={item.discountPremium.includes("-") ? "destructive" : "default"}
                            className={!item.discountPremium.includes("-") ? "bg-green-500/20 text-green-600 hover:bg-green-500/30" : ""}
                          >
                            {item.discountPremium}
                          </Badge>
                        ) : item.valuationPercent !== undefined ? (
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
                      <TableCell className="text-sm">
                        {item.growthRates || "-"}
                      </TableCell>
                      <TableCell>
                        {item.moat && (
                          <Badge variant={item.moat === "Wide" ? "default" : item.moat === "Narrow" ? "secondary" : "outline"} className="text-xs">
                            {item.moat}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                        {item.investmentType || "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.supportLevel1 ? `$${parseFloat(item.supportLevel1 as string).toFixed(2)}` : "-"}
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
