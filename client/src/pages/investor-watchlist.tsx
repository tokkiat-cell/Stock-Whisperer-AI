import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Upload, Trash2, TrendingUp, TrendingDown, RefreshCw, Target, ArrowUp, ArrowDown, Filter, ChevronUp, ChevronDown, LineChart, Pencil, Check, X, Star } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StockChart } from "@/components/stock-chart";
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
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newIntrinsicValue, setNewIntrinsicValue] = useState("");
  const [newMoat, setNewMoat] = useState("");
  const [newS1, setNewS1] = useState("");
  const [newS2, setNewS2] = useState("");
  const [newS3, setNewS3] = useState("");
  const [newS4, setNewS4] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quotesCache, setQuotesCache] = useState<Record<string, StockQuote>>({});
  const [filterMoat, setFilterMoat] = useState<string>("all");
  const [filterValuation, setFilterValuation] = useState<"all" | "undervalued" | "overvalued">("all");
  const [sortField, setSortField] = useState<string>("symbol");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDialogItem, setEditDialogItem] = useState<InvestorTargetItem | null>(null);
  const [editDialogValues, setEditDialogValues] = useState<Record<string, string>>({});

  const { data: targetList = [], isLoading } = useQuery<InvestorTargetItem[]>({
    queryKey: ["/api/investor-target-list"],
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: { 
      symbol: string; 
      intrinsicValue: string; 
      companyName?: string;
      moat?: string;
      supportLevel1?: string;
      supportLevel2?: string;
      supportLevel3?: string;
      supportLevel4?: string;
      notes?: string;
    }) => {
      return apiRequest("POST", "/api/investor-target-list", { ...item, source: "USER_UPLOADED" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investor-target-list"] });
      toast({ title: "Stock added to target list" });
      setIsAddDialogOpen(false);
      setNewSymbol("");
      setNewCompanyName("");
      setNewIntrinsicValue("");
      setNewMoat("");
      setNewS1("");
      setNewS2("");
      setNewS3("");
      setNewS4("");
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

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, string | boolean | null> }) => {
      return apiRequest("PUT", `/api/investor-target-list/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investor-target-list"] });
      setEditingCell(null);
      setEditValue("");
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  // Seed default stocks for new users
  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/investor-target-list/seed-defaults", {});
    },
    onSuccess: (data: any) => {
      if (data.seeded) {
        queryClient.invalidateQueries({ queryKey: ["/api/investor-target-list"] });
        toast({ title: `Loaded ${data.count} starter stocks for your Growth Stocklist` });
      }
    },
  });

  // Auto-seed defaults for new users on first load
  const [hasCheckedSeed, setHasCheckedSeed] = useState(false);
  useEffect(() => {
    if (!isLoading && !hasCheckedSeed && targetList.length === 0) {
      setHasCheckedSeed(true);
      seedDefaultsMutation.mutate();
    }
  }, [isLoading, hasCheckedSeed, targetList.length]);

  const toggleFavorite = (item: TargetItemWithQuote) => {
    updateItemMutation.mutate({
      id: item.id,
      data: { isFavorite: !item.isFavorite }
    });
  };

  const openEditDialog = (item: InvestorTargetItem) => {
    setEditDialogItem(item);
    setEditDialogValues({
      symbol: item.symbol || "",
      companyName: item.companyName || "",
      intrinsicValue: item.intrinsicValue?.toString() || "",
      moat: item.moat || "",
      supportLevel1: item.supportLevel1?.toString() || "",
      supportLevel2: item.supportLevel2?.toString() || "",
      supportLevel3: item.supportLevel3?.toString() || "",
      supportLevel4: item.supportLevel4?.toString() || "",
      notes: item.notes || "",
    });
  };

  const handleEditDialogSave = () => {
    if (!editDialogItem) return;
    
    // Validate numeric fields
    const numericFields = ['intrinsicValue', 'supportLevel1', 'supportLevel2', 'supportLevel3', 'supportLevel4'];
    const fieldLabels: Record<string, string> = {
      intrinsicValue: 'Intrinsic Value',
      supportLevel1: 'S1',
      supportLevel2: 'S2',
      supportLevel3: 'S3',
      supportLevel4: 'S4',
    };
    
    for (const field of numericFields) {
      const value = editDialogValues[field];
      if (value && isNaN(parseFloat(value))) {
        toast({ title: `${fieldLabels[field]} must be a valid number`, variant: "destructive" });
        return;
      }
    }
    
    // Convert empty strings to null for numeric fields to avoid database errors
    const cleanedData: Record<string, string | null> = {};
    
    for (const [key, value] of Object.entries(editDialogValues)) {
      if (numericFields.includes(key) && value === '') {
        cleanedData[key] = null as any;
      } else {
        cleanedData[key] = value;
      }
    }
    
    updateItemMutation.mutate({
      id: editDialogItem.id,
      data: cleanedData
    }, {
      onSuccess: () => {
        setEditDialogItem(null);
        toast({ title: "Stock updated successfully" });
      }
    });
  };

  const handleEditStart = (id: number, field: string, currentValue: string | number | null) => {
    setEditingCell({ id, field });
    setEditValue(currentValue?.toString() || "");
  };

  const handleEditSave = () => {
    if (!editingCell || updateItemMutation.isPending) return;
    const numValue = parseFloat(editValue);
    // Allow empty values (will be converted to null) or valid numbers
    if (isNaN(numValue) && editValue !== "") return;
    
    // For numeric fields, send null if empty, otherwise send the value
    const numericFields = ['intrinsicValue', 'supportLevel1', 'supportLevel2', 'supportLevel3', 'supportLevel4'];
    const valueToSend = numericFields.includes(editingCell.field) && editValue === '' 
      ? null 
      : editValue;
    
    updateItemMutation.mutate({ 
      id: editingCell.id, 
      data: { [editingCell.field]: valueToSend } 
    });
  };

  const handleEditCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const fetchQuotes = async () => {
    if (targetList.length === 0) return;
    
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/investor-target-list/quotes');
      if (response.ok) {
        const quotes = await response.json();
        setQuotesCache(quotes);
      } else {
        console.error('Failed to fetch batch quotes');
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-fetch prices when target list loads (only once on initial load)
  useEffect(() => {
    if (targetList.length > 0 && !hasAutoFetched && !isRefreshing) {
      setHasAutoFetched(true);
      fetchQuotes();
    }
  }, [targetList.length, hasAutoFetched, isRefreshing]);

  const handleAddItem = () => {
    if (!newSymbol || !newIntrinsicValue) {
      toast({ title: "Please fill in symbol and intrinsic value", variant: "destructive" });
      return;
    }
    
    // Validate numeric fields
    const validateNumeric = (val: string, fieldName: string): boolean => {
      if (!val) return true; // Empty is ok (optional fields)
      const num = parseFloat(val);
      if (isNaN(num)) {
        toast({ title: `${fieldName} must be a valid number`, variant: "destructive" });
        return false;
      }
      return true;
    };
    
    if (!validateNumeric(newIntrinsicValue, "Intrinsic Value")) return;
    if (!validateNumeric(newS1, "S1")) return;
    if (!validateNumeric(newS2, "S2")) return;
    if (!validateNumeric(newS3, "S3")) return;
    if (!validateNumeric(newS4, "S4")) return;
    
    addItemMutation.mutate({
      symbol: newSymbol.toUpperCase(),
      intrinsicValue: newIntrinsicValue,
      companyName: newCompanyName || undefined,
      moat: newMoat || undefined,
      supportLevel1: newS1 || undefined,
      supportLevel2: newS2 || undefined,
      supportLevel3: newS3 || undefined,
      supportLevel4: newS4 || undefined,
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
        const symbolIdx = headers.findIndex(h => h === "symbol" || h === "ticker" || h === "stock" || h === "stock symbol" || h.includes("ticker"));
        const companyIdx = headers.findIndex(h => h === "company" || h === "name" || h === "company name" || h === "stock name");
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
          
          if (parts.length < 1 || !parts[0]) continue;
          
          const parseNum = (idx: number): string | undefined => {
            if (idx < 0) return undefined;
            const val = parts[idx]?.replace(/[^0-9.\-]/g, "");
            return val && !isNaN(parseFloat(val)) ? val : undefined;
          };

          // Skip category name rows that aren't actual stock symbols
          const categoryNames = ['ADAM LIST', 'FAVORITE', 'WATCHLIST', 'VALUE TRAP', 'SOLD', 'AVOID', 'HEADER', 'CATEGORY'];
          
          if (isAdamFormat) {
            // For Adam format, find the actual symbol column more carefully
            let symbol = "";
            if (symbolIdx >= 0 && parts[symbolIdx]) {
              symbol = stripExchangePrefix(parts[symbolIdx]);
            } else {
              // Look for a column that looks like a stock symbol (1-5 uppercase letters, possibly with numbers)
              for (let j = 0; j < parts.length; j++) {
                const val = parts[j]?.trim().toUpperCase();
                if (val && /^[A-Z0-9]{1,6}(\.[A-Z0-9]{1,2})?$/.test(val) && !categoryNames.includes(val)) {
                  symbol = val;
                  break;
                }
              }
            }
            if (!symbol || symbol.length === 0 || symbol.length > 20 || categoryNames.includes(symbol.toUpperCase())) continue;
            
            const avgIV = parseNum(averageIVIdx);
            const baseIV = parseNum(baseIVIdx);
            const conservIV = parseNum(conservativeIVIdx);
            const intrinsicValue = avgIV || baseIV || conservIV || "0";
            
            items.push({
              symbol,
              intrinsicValue,
              companyName: companyIdx >= 0 ? parts[companyIdx] : undefined,
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
            if (!symbol || symbol.length === 0 || symbol.length > 20 || categoryNames.includes(symbol.toUpperCase())) continue;
            
            items.push({ 
              symbol, 
              intrinsicValue: "0", 
              notes: descIdx >= 0 ? parts[descIdx] : undefined 
            });
          } else {
            const symbol = stripExchangePrefix(symbolIdx >= 0 ? parts[symbolIdx] : parts[0]);
            if (!symbol || symbol.length === 0 || symbol.length > 20 || categoryNames.includes(symbol.toUpperCase())) continue;
            
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

    if (filterMoat !== "all") {
      items = items.filter(i => i.moat?.toLowerCase() === filterMoat.toLowerCase());
    }

    if (filterValuation === "undervalued") {
      items = items.filter(i => i.valuationPercent !== undefined && i.valuationPercent > 0);
    } else if (filterValuation === "overvalued") {
      items = items.filter(i => i.valuationPercent !== undefined && i.valuationPercent < 0);
    }

    items.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "isFavorite":
          aVal = a.isFavorite ? 1 : 0;
          bVal = b.isFavorite ? 1 : 0;
          break;
        case "symbol":
          aVal = a.symbol || "";
          bVal = b.symbol || "";
          break;
        case "companyName":
          aVal = a.companyName || "";
          bVal = b.companyName || "";
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
        case "moat":
          aVal = a.moat || "";
          bVal = b.moat || "";
          break;
        case "investmentType":
          aVal = a.investmentType || "";
          bVal = b.investmentType || "";
          break;
        case "supportLevel1":
          aVal = parseFloat(a.supportLevel1 as string) || 0;
          bVal = parseFloat(b.supportLevel1 as string) || 0;
          break;
        case "supportLevel2":
          aVal = parseFloat(a.supportLevel2 as string) || 0;
          bVal = parseFloat(b.supportLevel2 as string) || 0;
          break;
        case "supportLevel3":
          aVal = parseFloat(a.supportLevel3 as string) || 0;
          bVal = parseFloat(b.supportLevel3 as string) || 0;
          break;
        case "supportLevel4":
          aVal = parseFloat(a.supportLevel4 as string) || 0;
          bVal = parseFloat(b.supportLevel4 as string) || 0;
          break;
        case "supportLevel5":
          aVal = parseFloat(a.supportLevel5 as string) || 0;
          bVal = parseFloat(b.supportLevel5 as string) || 0;
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
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Growth Stocklist
          </h1>
          <p className="text-muted-foreground">
            Strong foundation stocks to watch. Avg IV is your calculated intrinsic value. S1-S5 are support levels where you can deploy 20% of your investment at each level touched.
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Stock to Target List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol *</Label>
                    <Input
                      id="symbol"
                      placeholder="e.g., AAPL"
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                      data-testid="input-symbol"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company</Label>
                    <Input
                      id="companyName"
                      placeholder="e.g., Apple Inc"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      data-testid="input-company-name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="intrinsicValue">Intrinsic Value ($) *</Label>
                    <Input
                      id="intrinsicValue"
                      type="text"
                      placeholder="e.g., 200.00"
                      value={newIntrinsicValue}
                      onChange={(e) => setNewIntrinsicValue(e.target.value)}
                      data-testid="input-intrinsic-value"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moat">Moat</Label>
                    <Select value={newMoat} onValueChange={setNewMoat}>
                      <SelectTrigger id="moat" data-testid="select-moat">
                        <SelectValue placeholder="Select moat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Wide">Wide</SelectItem>
                        <SelectItem value="Narrow">Narrow</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="s1">S1</Label>
                    <Input
                      id="s1"
                      type="text"
                      placeholder="S1"
                      value={newS1}
                      onChange={(e) => setNewS1(e.target.value)}
                      data-testid="input-s1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s2">S2</Label>
                    <Input
                      id="s2"
                      type="text"
                      placeholder="S2"
                      value={newS2}
                      onChange={(e) => setNewS2(e.target.value)}
                      data-testid="input-s2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s3">S3</Label>
                    <Input
                      id="s3"
                      type="text"
                      placeholder="S3"
                      value={newS3}
                      onChange={(e) => setNewS3(e.target.value)}
                      data-testid="input-s3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s4">S4</Label>
                    <Input
                      id="s4"
                      type="text"
                      placeholder="S4"
                      value={newS4}
                      onChange={(e) => setNewS4(e.target.value)}
                      data-testid="input-s4"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
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

          <Dialog open={!!editDialogItem} onOpenChange={(open) => !open && setEditDialogItem(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Stock</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-symbol">Symbol</Label>
                    <Input
                      id="edit-symbol"
                      value={editDialogValues.symbol || ""}
                      onChange={(e) => setEditDialogValues(v => ({ ...v, symbol: e.target.value.toUpperCase() }))}
                      data-testid="input-edit-symbol"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-company">Company</Label>
                    <Input
                      id="edit-company"
                      value={editDialogValues.companyName || ""}
                      onChange={(e) => setEditDialogValues(v => ({ ...v, companyName: e.target.value }))}
                      data-testid="input-edit-company"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-iv">Intrinsic Value ($)</Label>
                    <Input
                      id="edit-iv"
                      type="text"
                      value={editDialogValues.intrinsicValue || ""}
                      onChange={(e) => setEditDialogValues(v => ({ ...v, intrinsicValue: e.target.value }))}
                      data-testid="input-edit-iv"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-moat">Moat</Label>
                    <Select
                      value={editDialogValues.moat || ""}
                      onValueChange={(value) => setEditDialogValues(v => ({ ...v, moat: value }))}
                    >
                      <SelectTrigger id="edit-moat" data-testid="select-edit-moat">
                        <SelectValue placeholder="Select moat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Wide">Wide</SelectItem>
                        <SelectItem value="Narrow">Narrow</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-s1">S1</Label>
                    <Input
                      id="edit-s1"
                      type="text"
                      value={editDialogValues.supportLevel1 || ""}
                      onChange={(e) => setEditDialogValues(v => ({ ...v, supportLevel1: e.target.value }))}
                      data-testid="input-edit-s1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-s2">S2</Label>
                    <Input
                      id="edit-s2"
                      type="text"
                      value={editDialogValues.supportLevel2 || ""}
                      onChange={(e) => setEditDialogValues(v => ({ ...v, supportLevel2: e.target.value }))}
                      data-testid="input-edit-s2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-s3">S3</Label>
                    <Input
                      id="edit-s3"
                      type="text"
                      value={editDialogValues.supportLevel3 || ""}
                      onChange={(e) => setEditDialogValues(v => ({ ...v, supportLevel3: e.target.value }))}
                      data-testid="input-edit-s3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-s4">S4</Label>
                    <Input
                      id="edit-s4"
                      type="text"
                      value={editDialogValues.supportLevel4 || ""}
                      onChange={(e) => setEditDialogValues(v => ({ ...v, supportLevel4: e.target.value }))}
                      data-testid="input-edit-s4"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Input
                    id="edit-notes"
                    value={editDialogValues.notes || ""}
                    onChange={(e) => setEditDialogValues(v => ({ ...v, notes: e.target.value }))}
                    data-testid="input-edit-notes"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleEditDialogSave}
                  disabled={updateItemMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {targetList.length > 0 && Object.keys(quotesCache).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover-elevate ${filterValuation === "undervalued" ? "ring-2 ring-green-500" : ""}`}
            onClick={() => setFilterValuation(filterValuation === "undervalued" ? "all" : "undervalued")}
            data-testid="card-undervalued"
          >
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
          <Card 
            className={`cursor-pointer transition-all hover-elevate ${filterValuation === "overvalued" ? "ring-2 ring-red-500" : ""}`}
            onClick={() => setFilterValuation(filterValuation === "overvalued" ? "all" : "overvalued")}
            data-testid="card-overvalued"
          >
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
          <Card 
            className={`cursor-pointer transition-all hover-elevate ${filterValuation === "all" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilterValuation("all")}
            data-testid="card-total"
          >
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
                  CSV format: Symbol, Average IV, S1, S2, S3, S4, S5, Notes (optional)
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="w-10 cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("isFavorite")}
                      data-testid="header-favorite"
                    >
                      <div className="flex items-center justify-center">
                        <Star className="h-4 w-4" />
                        {sortField === "isFavorite" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("symbol")}
                      data-testid="header-symbol"
                    >
                      <div className="flex items-center gap-1">
                        Symbol
                        {sortField === "symbol" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("companyName")}
                      data-testid="header-company"
                    >
                      <div className="flex items-center gap-1">
                        Company
                        {sortField === "companyName" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("currentPrice")}
                      data-testid="header-market-price"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Price
                        {sortField === "currentPrice" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("intrinsicValue")}
                      data-testid="header-avg-iv"
                    >
                      <div className="flex items-center justify-end gap-1">
                        IV
                        {sortField === "intrinsicValue" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("valuation")}
                      data-testid="header-discount"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Disc%
                        {sortField === "valuation" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("moat")}
                      data-testid="header-moat"
                    >
                      <div className="flex items-center gap-1">
                        Moat
                        {sortField === "moat" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("supportLevel1")}
                      data-testid="header-s1"
                    >
                      <div className="flex items-center justify-end gap-1">
                        S1
                        {sortField === "supportLevel1" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("supportLevel2")}
                      data-testid="header-s2"
                    >
                      <div className="flex items-center justify-end gap-1">
                        S2
                        {sortField === "supportLevel2" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("supportLevel3")}
                      data-testid="header-s3"
                    >
                      <div className="flex items-center justify-end gap-1">
                        S3
                        {sortField === "supportLevel3" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("supportLevel4")}
                      data-testid="header-s4"
                    >
                      <div className="flex items-center justify-end gap-1">
                        S4
                        {sortField === "supportLevel4" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead className="w-16 text-center" data-testid="header-actions">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsWithQuotes.map((item) => (
                    <TableRow key={item.id} data-testid={`row-stock-${item.symbol}`}>
                      <TableCell className="text-center">
                        <button
                          onClick={() => toggleFavorite(item)}
                          className="cursor-pointer hover:scale-110 transition-transform"
                          data-testid={`button-favorite-${item.symbol}`}
                        >
                          <Star 
                            className={`h-4 w-4 ${item.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => setChartSymbol(item.symbol)}
                          className="flex items-center gap-1 text-primary hover:underline cursor-pointer"
                          data-testid={`button-chart-${item.symbol}`}
                        >
                          <LineChart className="h-3 w-3" />
                          {item.symbol}
                        </button>
                      </TableCell>
                      <TableCell 
                        className="text-sm text-muted-foreground truncate max-w-[100px]"
                        data-testid={`text-company-${item.symbol}`}
                      >
                        {item.companyName || "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.currentPrice ? (
                          `$${item.currentPrice.toFixed(2)}`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {editingCell?.id === item.id && editingCell?.field === "intrinsicValue" ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="text"
                              className="w-20 text-right"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={handleEditCancel}
                              autoFocus
                              data-testid={`input-iv-${item.symbol}`}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditStart(item.id, "intrinsicValue", item.intrinsicValue)}
                            className="hover:bg-muted/50 px-1 rounded cursor-pointer"
                            data-testid={`edit-iv-${item.symbol}`}
                          >
                            {parseFloat(item.intrinsicValue as string) > 0 
                              ? `$${parseFloat(item.intrinsicValue as string).toFixed(0)}`
                              : <span className="text-muted-foreground">-</span>
                            }
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.valuationPercent !== undefined ? (
                          <Badge 
                            variant={item.valuationPercent > 0 ? "default" : "destructive"}
                            className={`text-xs whitespace-nowrap ${item.valuationPercent > 0 ? "bg-green-500/20 text-green-600" : ""}`}
                          >
                            {Math.abs(item.valuationPercent).toFixed(0)}% {item.valuationPercent > 0 ? "under" : "over"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.moat && (
                          <Badge variant={item.moat === "Wide" ? "default" : item.moat === "Narrow" ? "secondary" : "outline"} className="text-xs">
                            {item.moat}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {editingCell?.id === item.id && editingCell?.field === "supportLevel1" ? (
                          <Input
                            type="text"
                            className="w-16 text-right"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={handleEditCancel}
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => handleEditStart(item.id, "supportLevel1", item.supportLevel1)}
                            className="hover:bg-muted/50 px-1 rounded cursor-pointer"
                          >
                            {item.supportLevel1 ? `$${parseFloat(item.supportLevel1 as string).toFixed(0)}` : "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {editingCell?.id === item.id && editingCell?.field === "supportLevel2" ? (
                          <Input
                            type="text"
                            className="w-16 text-right"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={handleEditCancel}
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => handleEditStart(item.id, "supportLevel2", item.supportLevel2)}
                            className="hover:bg-muted/50 px-1 rounded cursor-pointer"
                          >
                            {item.supportLevel2 ? `$${parseFloat(item.supportLevel2 as string).toFixed(0)}` : "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {editingCell?.id === item.id && editingCell?.field === "supportLevel3" ? (
                          <Input
                            type="text"
                            className="w-16 text-right"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={handleEditCancel}
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => handleEditStart(item.id, "supportLevel3", item.supportLevel3)}
                            className="hover:bg-muted/50 px-1 rounded cursor-pointer"
                          >
                            {item.supportLevel3 ? `$${parseFloat(item.supportLevel3 as string).toFixed(0)}` : "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {editingCell?.id === item.id && editingCell?.field === "supportLevel4" ? (
                          <Input
                            type="text"
                            className="w-16 text-right"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={handleEditCancel}
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => handleEditStart(item.id, "supportLevel4", item.supportLevel4)}
                            className="hover:bg-muted/50 px-1 rounded cursor-pointer"
                          >
                            {item.supportLevel4 ? `$${parseFloat(item.supportLevel4 as string).toFixed(0)}` : "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(item)}
                            data-testid={`button-edit-${item.symbol}`}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            disabled={deleteItemMutation.isPending}
                            data-testid={`button-delete-${item.symbol}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Chart Dialog */}
      <StockChart
        symbol={chartSymbol || ""}
        open={!!chartSymbol}
        onOpenChange={(open) => {
          if (!open) setChartSymbol(null);
        }}
      />
    </div>
  );
}
