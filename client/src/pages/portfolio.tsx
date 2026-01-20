import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Wallet, Plus, Upload, Clipboard, Trash2, Loader2, Eye, 
  DollarSign, TrendingUp, BarChart3, Activity, FileSpreadsheet,
  Image, X, Sparkles, Bell, BellRing, ChevronUp, ChevronDown, Brain, LineChart,
  ShieldCheck, ExternalLink
} from "lucide-react";
import type { PortfolioHolding, WatchlistItem, PriceAlert, UserNotificationSettings } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SiTelegram, SiWhatsapp } from "react-icons/si";
import { Settings } from "lucide-react";
import { StockChart } from "@/components/stock-chart";

export default function PortfolioPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("holdings");
  const [addHoldingOpen, setAddHoldingOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addWatchOpen, setAddWatchOpen] = useState(false);
  const [importWatchOpen, setImportWatchOpen] = useState(false);
  
  const [newSymbol, setNewSymbol] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newAvgCost, setNewAvgCost] = useState("");
  const [watchSymbol, setWatchSymbol] = useState("");
  const [watchNotes, setWatchNotes] = useState("");
  const [pasteData, setPasteData] = useState("");
  const [watchPasteData, setWatchPasteData] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedSymbols, setExtractedSymbols] = useState<string[]>([]);
  
  // Price Alert State
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState("");
  const [alertPrice, setAlertPrice] = useState("");
  const [alertDirection, setAlertDirection] = useState<"ABOVE" | "BELOW">("ABOVE");
  const [alertType, setAlertType] = useState<"PRICE" | "AI_MODEL">("PRICE");
  const [alertChannels, setAlertChannels] = useState<string[]>(["APP"]);
  
  // Notification Settings State
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Stock Chart State
  const [chartOpen, setChartOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("");
  
  const openChart = (symbol: string) => {
    setChartSymbol(symbol);
    setChartOpen(true);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: holdings = [], isLoading: holdingsLoading } = useQuery<PortfolioHolding[]>({
    queryKey: ["/api/portfolio"],
  });

  const { data: watchlist = [], isLoading: watchlistLoading } = useQuery<WatchlistItem[]>({
    queryKey: ["/api/watchlist"],
  });

  const { data: priceAlerts = [] } = useQuery<PriceAlert[]>({
    queryKey: ["/api/price-alerts"],
  });

  const { data: triggeredAlerts = [], refetch: refetchTriggered } = useQuery<PriceAlert[]>({
    queryKey: ["/api/price-alerts/triggered"],
  });

  const { data: notificationSettings } = useQuery<UserNotificationSettings | null>({
    queryKey: ["/api/notification-settings"],
  });

  // Check alerts periodically (every 60 seconds when tab is active and on watchlist tab)
  const checkAlertsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/price-alerts/check");
    },
    onSuccess: async (response) => {
      const data = await response.json();
      if (data.triggered > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/price-alerts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/price-alerts/triggered"] });
        toast({ 
          title: `${data.triggered} price alert${data.triggered > 1 ? 's' : ''} triggered!`,
          variant: "default"
        });
      }
    },
    onError: () => {
      // Silently fail - don't disturb user if alert check fails
    },
  });

  // Check alerts on mount and periodically only when document is visible and on watchlist tab
  useEffect(() => {
    const checkIfActive = () => {
      return !document.hidden && activeTab === "watchlist";
    };
    
    // Initial check if active
    if (checkIfActive()) {
      checkAlertsMutation.mutate();
    }
    
    const interval = setInterval(() => {
      if (checkIfActive()) {
        checkAlertsMutation.mutate();
      }
    }, 60000); // Check every 60 seconds
    
    return () => clearInterval(interval);
  }, [activeTab]);

  const createAlertMutation = useMutation({
    mutationFn: async (data: { symbol: string; targetPrice: string; direction: string; alertType: string; notifyChannels: string[] }) => {
      return apiRequest("POST", "/api/price-alerts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-alerts"] });
      setAlertDialogOpen(false);
      setAlertPrice("");
      setAlertSymbol("");
      setAlertChannels(["APP"]);
      toast({ title: "Price alert created" });
    },
    onError: () => {
      toast({ title: "Failed to create alert", variant: "destructive" });
    },
  });

  const updateNotificationSettingsMutation = useMutation({
    mutationFn: async (data: Partial<UserNotificationSettings>) => {
      return apiRequest("POST", "/api/notification-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      toast({ title: "Notification settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/price-alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/price-alerts/triggered"] });
      toast({ title: "Alert removed" });
    },
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/price-alerts/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/price-alerts/triggered"] });
    },
  });

  const getAlertsForSymbol = (symbol: string) => {
    return priceAlerts.filter(a => a.symbol === symbol && a.isActive && !a.isTriggered);
  };

  const handleCreateAlert = () => {
    if (!alertSymbol || !alertPrice) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    const priceNum = parseFloat(alertPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: "Please enter a valid positive price", variant: "destructive" });
      return;
    }
    if (alertChannels.length === 0) {
      toast({ title: "Please select at least one notification channel", variant: "destructive" });
      return;
    }
    createAlertMutation.mutate({
      symbol: alertSymbol.toUpperCase(),
      targetPrice: alertPrice,
      direction: alertDirection,
      alertType: alertType,
      notifyChannels: alertChannels,
    });
  };

  const openAlertDialog = (symbol: string) => {
    setAlertSymbol(symbol);
    setAlertPrice("");
    setAlertDirection("ABOVE");
    setAlertType("PRICE");
    setAlertChannels(["APP"]);
    setAlertDialogOpen(true);
  };

  const toggleChannel = (channel: string) => {
    setAlertChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const createHoldingMutation = useMutation({
    mutationFn: async (data: { symbol: string; shares: string; avgCost: string }) => {
      return apiRequest("POST", "/api/portfolio", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      setAddHoldingOpen(false);
      setNewSymbol("");
      setNewShares("");
      setNewAvgCost("");
      toast({ title: "Holding added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add holding", variant: "destructive" });
    },
  });

  const bulkCreateHoldingsMutation = useMutation({
    mutationFn: async (holdings: Array<{ symbol: string; shares: string; avgCost: string }>) => {
      return apiRequest("POST", "/api/portfolio/bulk", { holdings });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      setImportOpen(false);
      setPasteData("");
      toast({ title: `${variables.length} holdings imported successfully` });
    },
    onError: () => {
      toast({ title: "Failed to import holdings", variant: "destructive" });
    },
  });

  const deleteHoldingMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/portfolio/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({ title: "Holding removed" });
    },
  });

  const addWatchlistMutation = useMutation({
    mutationFn: async (data: { symbol: string; notes?: string }) => {
      return apiRequest("POST", "/api/watchlist", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      setAddWatchOpen(false);
      setWatchSymbol("");
      setWatchNotes("");
      toast({ title: "Added to watchlist" });
    },
    onError: () => {
      toast({ title: "Failed to add to watchlist", variant: "destructive" });
    },
  });

  const bulkAddWatchlistMutation = useMutation({
    mutationFn: async (symbols: string[]) => {
      return apiRequest("POST", "/api/watchlist/bulk", { symbols });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      setImportWatchOpen(false);
      setWatchPasteData("");
      toast({ title: `${variables.length} stocks added to watchlist` });
    },
    onError: () => {
      toast({ title: "Failed to add to watchlist", variant: "destructive" });
    },
  });

  const deleteWatchlistMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/watchlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({ title: "Removed from watchlist" });
    },
  });

  const extractFromImageMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const res = await apiRequest("POST", "/api/portfolio/extract-from-image", { imageBase64 });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.symbols && data.symbols.length > 0) {
        setExtractedSymbols(data.symbols);
        toast({ title: `Found ${data.symbols.length} stock symbols` });
      } else {
        toast({ title: "No stock symbols found in image", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Failed to analyze image", variant: "destructive" });
    },
  });

  const handleAddHolding = () => {
    if (!newSymbol || !newShares || !newAvgCost) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    createHoldingMutation.mutate({
      symbol: newSymbol.toUpperCase(),
      shares: newShares,
      avgCost: newAvgCost,
    });
  };

  const parseImportData = (data: string): Array<{ symbol: string; shares: string; avgCost: string }> => {
    const lines = data.trim().split("\n").filter(line => line.trim());
    const holdings: Array<{ symbol: string; shares: string; avgCost: string }> = [];
    
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map(p => p.trim());
      if (parts.length >= 3) {
        const symbol = parts[0].toUpperCase().replace(/[^A-Z]/g, '');
        const shares = parts[1].replace(/[^0-9.]/g, '');
        const avgCost = parts[2].replace(/[^0-9.]/g, '');
        if (symbol && shares && avgCost) {
          holdings.push({ symbol, shares, avgCost });
        }
      } else if (parts.length === 1 && parts[0]) {
        const symbol = parts[0].toUpperCase().replace(/[^A-Z]/g, '');
        if (symbol) {
          holdings.push({ symbol, shares: "0", avgCost: "0" });
        }
      }
    }
    return holdings;
  };

  const handlePasteImport = () => {
    const parsed = parseImportData(pasteData);
    if (parsed.length === 0) {
      toast({ title: "No valid data found. Use format: SYMBOL, SHARES, COST", variant: "destructive" });
      return;
    }
    bulkCreateHoldingsMutation.mutate(parsed);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const readXlsxFile = (await import("read-excel-file")).default;
      const rows = await readXlsxFile(file);
      
      const holdings: Array<{ symbol: string; shares: string; avgCost: string }> = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 3) {
          const symbol = String(row[0] || '').toUpperCase().replace(/[^A-Z]/g, '');
          const shares = String(row[1] || '').replace(/[^0-9.]/g, '');
          const avgCost = String(row[2] || '').replace(/[^0-9.]/g, '');
          if (symbol && shares && avgCost && symbol !== 'SYMBOL') {
            holdings.push({ symbol, shares, avgCost });
          }
        }
      }
      
      if (holdings.length === 0) {
        toast({ title: "No valid data found in file", variant: "destructive" });
        return;
      }
      
      bulkCreateHoldingsMutation.mutate(holdings);
    } catch (error) {
      toast({ title: "Failed to parse Excel file", variant: "destructive" });
    }
  };

  const handleAddWatch = () => {
    if (!watchSymbol) {
      toast({ title: "Please enter a symbol", variant: "destructive" });
      return;
    }
    addWatchlistMutation.mutate({
      symbol: watchSymbol.toUpperCase(),
      notes: watchNotes || undefined,
    });
  };

  const handleWatchPasteImport = () => {
    const lines = watchPasteData.trim().split(/[\n,\t]/).map(s => s.trim().toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean);
    if (lines.length === 0) {
      toast({ title: "No valid symbols found", variant: "destructive" });
      return;
    }
    bulkAddWatchlistMutation.mutate(lines);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      extractFromImageMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleAddExtractedSymbols = () => {
    if (extractedSymbols.length === 0) return;
    const holdingsToAdd = extractedSymbols.map(symbol => ({
      symbol: symbol.toUpperCase(),
      shares: "0",
      avgCost: "0",
    }));
    bulkCreateHoldingsMutation.mutate(holdingsToAdd);
    setExtractedSymbols([]);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const clearImageExtraction = () => {
    setImagePreview(null);
    setExtractedSymbols([]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const totalValue = holdings.reduce((acc, h) => acc + (parseFloat(h.shares) * parseFloat(h.avgCost)), 0);
  const totalShares = holdings.reduce((acc, h) => acc + parseFloat(h.shares), 0);

  if (holdingsLoading || watchlistLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          Portfolio & Watchlist
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your portfolio holdings and track stocks on your watchlist
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Value</p>
              <h3 className="text-xl font-mono font-bold text-foreground">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Holdings</p>
              <h3 className="text-xl font-mono font-bold text-foreground">{holdings.length}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Shares</p>
              <h3 className="text-xl font-mono font-bold text-foreground">{totalShares.toLocaleString()}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Watching</p>
              <h3 className="text-xl font-mono font-bold text-foreground">{watchlist.length}</h3>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="holdings" data-testid="tab-holdings">
            <Wallet className="w-4 h-4 mr-2" />
            Holdings ({holdings.length})
          </TabsTrigger>
          <TabsTrigger value="watchlist" data-testid="tab-watchlist">
            <Eye className="w-4 h-4 mr-2" />
            Watchlist ({watchlist.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="mt-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <Dialog open={addHoldingOpen} onOpenChange={setAddHoldingOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-holding">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Holding
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Portfolio Holding</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Symbol</label>
                    <Input
                      placeholder="AAPL"
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                      data-testid="input-holding-symbol"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Shares</label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={newShares}
                      onChange={(e) => setNewShares(e.target.value)}
                      data-testid="input-holding-shares"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Average Cost ($)</label>
                    <Input
                      type="number"
                      placeholder="150.00"
                      value={newAvgCost}
                      onChange={(e) => setNewAvgCost(e.target.value)}
                      data-testid="input-holding-cost"
                    />
                  </div>
                  <Button 
                    onClick={handleAddHolding} 
                    className="w-full"
                    disabled={createHoldingMutation.isPending}
                    data-testid="button-submit-holding"
                  >
                    {createHoldingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Holding"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={importOpen} onOpenChange={(open) => {
              setImportOpen(open);
              if (!open) clearImageExtraction();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-import-holdings">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Portfolio Holdings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Image className="w-4 h-4 text-primary" />
                      <Sparkles className="w-3 h-3 text-primary" />
                      Upload Screenshot (AI Extraction)
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Upload a screenshot of your portfolio and AI will extract stock symbols
                    </p>
                    <Input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={extractFromImageMutation.isPending}
                      data-testid="input-image-upload"
                    />
                    {extractFromImageMutation.isPending && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing image...
                      </div>
                    )}
                    {imagePreview && extractedSymbols.length > 0 && (
                      <div className="mt-3 p-3 bg-secondary rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Extracted Symbols:</span>
                          <button
                            onClick={clearImageExtraction}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {extractedSymbols.map((symbol) => (
                            <span key={symbol} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                              {symbol}
                            </span>
                          ))}
                        </div>
                        <Button
                          onClick={handleAddExtractedSymbols}
                          size="sm"
                          className="w-full"
                          disabled={bulkCreateHoldingsMutation.isPending}
                          data-testid="button-add-extracted"
                        >
                          {bulkCreateHoldingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Add ${extractedSymbols.length} Symbols to Holdings`}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Shares and cost will be set to 0. You can edit them later.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Upload Excel File
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Format: Column A = Symbol, Column B = Shares, Column C = Avg Cost
                    </p>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      data-testid="input-file-upload"
                    />
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Clipboard className="w-4 h-4" />
                      Paste Data
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Format: SYMBOL, SHARES, COST (one per line)
                    </p>
                    <Textarea
                      placeholder="AAPL, 100, 150.50&#10;MSFT, 50, 380.25&#10;GOOGL, 25, 140.00"
                      value={pasteData}
                      onChange={(e) => setPasteData(e.target.value)}
                      rows={5}
                      data-testid="textarea-paste-holdings"
                    />
                  </div>
                  
                  <Button 
                    onClick={handlePasteImport} 
                    className="w-full"
                    disabled={!pasteData.trim() || bulkCreateHoldingsMutation.isPending}
                    data-testid="button-import-paste"
                  >
                    {bulkCreateHoldingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import from Paste"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {holdings.length === 0 ? (
            <Card className="p-8 text-center">
              <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <h3 className="font-semibold mb-1">No holdings yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your portfolio holdings manually, upload an Excel file, or paste your list.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
                <div>Symbol</div>
                <div className="text-right">Shares</div>
                <div className="text-right">Avg Cost</div>
                <div className="text-right">Value</div>
                <div></div>
              </div>
              {holdings.map((holding) => (
                <Card key={holding.id} className="p-4" data-testid={`holding-${holding.symbol}`}>
                  <div className="grid grid-cols-5 gap-4 items-center">
                    <button 
                      onClick={() => openChart(holding.symbol)}
                      className="font-semibold text-primary hover:underline cursor-pointer text-left flex items-center gap-1 group"
                      data-testid={`button-chart-holding-${holding.symbol}`}
                    >
                      {holding.symbol}
                      <LineChart className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <div className="text-right font-mono">{parseFloat(holding.shares).toLocaleString()}</div>
                    <div className="text-right font-mono">${parseFloat(holding.avgCost).toFixed(2)}</div>
                    <div className="text-right font-mono font-semibold">
                      ${(parseFloat(holding.shares) * parseFloat(holding.avgCost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteHoldingMutation.mutate(holding.id)}
                        data-testid={`button-delete-holding-${holding.symbol}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="watchlist" className="mt-6">
          {/* Triggered Alerts Banner */}
          {triggeredAlerts.length > 0 && (
            <Card className="p-4 mb-4 border-primary/50 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <BellRing className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Triggered Alerts ({triggeredAlerts.length})</h3>
              </div>
              <div className="space-y-3">
                {triggeredAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between p-3 bg-background rounded-md border" data-testid={`triggered-alert-${alert.id}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{alert.symbol}</span>
                        <Badge variant={alert.direction === 'ABOVE' ? 'default' : 'secondary'}>
                          {alert.direction === 'ABOVE' ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                          ${parseFloat(alert.targetPrice).toFixed(2)}
                        </Badge>
                        {alert.alertType === 'AI_MODEL' && (
                          <Badge variant="outline">
                            <Brain className="w-3 h-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Triggered at ${parseFloat(alert.triggeredPrice || '0').toFixed(2)} on {new Date(alert.triggeredAt!).toLocaleString()}
                      </p>
                      {alert.aiAnalysis && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <p className="font-medium text-xs mb-1">AI Analysis:</p>
                          <p className="text-muted-foreground text-xs whitespace-pre-wrap">{alert.aiAnalysis}</p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => dismissAlertMutation.mutate(alert.id)}
                      data-testid={`button-dismiss-alert-${alert.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <Dialog open={addWatchOpen} onOpenChange={setAddWatchOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-watch">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Watchlist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Watchlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Symbol</label>
                    <Input
                      placeholder="AAPL"
                      value={watchSymbol}
                      onChange={(e) => setWatchSymbol(e.target.value.toUpperCase())}
                      data-testid="input-watch-symbol"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes (optional)</label>
                    <Textarea
                      placeholder="Why are you watching this stock?"
                      value={watchNotes}
                      onChange={(e) => setWatchNotes(e.target.value)}
                      data-testid="input-watch-notes"
                    />
                  </div>
                  <Button 
                    onClick={handleAddWatch} 
                    className="w-full"
                    disabled={addWatchlistMutation.isPending}
                    data-testid="button-submit-watch"
                  >
                    {addWatchlistMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to Watchlist"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              onClick={() => setSettingsOpen(true)}
              data-testid="button-open-settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>

            <Dialog open={importWatchOpen} onOpenChange={setImportWatchOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-import-watchlist">
                  <Clipboard className="w-4 h-4 mr-2" />
                  Paste Symbols
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Watchlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Paste Stock Symbols</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter symbols separated by commas, tabs, or new lines
                    </p>
                    <Textarea
                      placeholder="AAPL, MSFT, GOOGL, AMZN&#10;NVDA&#10;META"
                      value={watchPasteData}
                      onChange={(e) => setWatchPasteData(e.target.value)}
                      rows={5}
                      data-testid="textarea-paste-watchlist"
                    />
                  </div>
                  <Button 
                    onClick={handleWatchPasteImport} 
                    className="w-full"
                    disabled={!watchPasteData.trim() || bulkAddWatchlistMutation.isPending}
                    data-testid="button-import-watchlist-submit"
                  >
                    {bulkAddWatchlistMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to Watchlist"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {watchlist.length === 0 ? (
            <Card className="p-8 text-center">
              <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Watchlist is empty</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add stocks to your watchlist to track them.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchlist.map((item) => {
                const symbolAlerts = getAlertsForSymbol(item.symbol);
                return (
                  <Card key={item.id} className="p-4" data-testid={`watchlist-${item.symbol}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <button 
                          onClick={() => openChart(item.symbol)}
                          className="font-semibold text-lg text-primary hover:underline cursor-pointer text-left flex items-center gap-1 group"
                          data-testid={`button-chart-watch-${item.symbol}`}
                        >
                          {item.symbol}
                          <LineChart className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Added {new Date(item.createdAt!).toLocaleDateString()}
                        </p>
                        
                        {/* Active Alerts for this symbol */}
                        {symbolAlerts.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {symbolAlerts.map((alert) => (
                              <div key={alert.id} className="flex items-center gap-1 text-xs">
                                <Badge variant="outline" className="text-xs">
                                  {alert.direction === 'ABOVE' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  ${parseFloat(alert.targetPrice).toFixed(2)}
                                  {alert.alertType === 'AI_MODEL' && <Brain className="w-3 h-3 ml-1" />}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteAlertMutation.mutate(alert.id)}
                                  data-testid={`button-delete-alert-${alert.id}`}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAlertDialog(item.symbol)}
                          data-testid={`button-add-alert-${item.symbol}`}
                        >
                          <Bell className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteWatchlistMutation.mutate(item.id)}
                          data-testid={`button-delete-watch-${item.symbol}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Create Alert Dialog */}
          <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Price Alert for {alertSymbol}</DialogTitle>
                <DialogDescription>
                  Get notified when this stock reaches your target price.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Target Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                    data-testid="input-alert-price"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Alert When Price Goes</label>
                  <Select value={alertDirection} onValueChange={(v) => setAlertDirection(v as "ABOVE" | "BELOW")}>
                    <SelectTrigger data-testid="select-alert-direction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABOVE">
                        <div className="flex items-center gap-2">
                          <ChevronUp className="w-4 h-4" />
                          Above Target
                        </div>
                      </SelectItem>
                      <SelectItem value="BELOW">
                        <div className="flex items-center gap-2">
                          <ChevronDown className="w-4 h-4" />
                          Below Target
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Alert Type</label>
                  <Select value={alertType} onValueChange={(v) => setAlertType(v as "PRICE" | "AI_MODEL")}>
                    <SelectTrigger data-testid="select-alert-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRICE">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          Price Alert Only
                        </div>
                      </SelectItem>
                      <SelectItem value="AI_MODEL">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          AI Model Analysis
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    AI Model will analyze the stock when the price alert triggers
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Send Alert To</label>
                  <div className="flex flex-col gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="channel-app" 
                        checked={alertChannels.includes("APP")}
                        onCheckedChange={() => toggleChannel("APP")}
                        data-testid="checkbox-channel-app"
                      />
                      <Label htmlFor="channel-app" className="flex items-center gap-2 cursor-pointer">
                        <Bell className="w-4 h-4" />
                        In-App Notification
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="channel-telegram" 
                        checked={alertChannels.includes("TELEGRAM")}
                        onCheckedChange={() => toggleChannel("TELEGRAM")}
                        disabled={!notificationSettings?.telegramEnabled}
                        data-testid="checkbox-channel-telegram"
                      />
                      <Label htmlFor="channel-telegram" className="flex items-center gap-2 cursor-pointer">
                        <SiTelegram className="w-4 h-4 text-[#0088cc]" />
                        Telegram
                        {!notificationSettings?.telegramEnabled && (
                          <span className="text-xs text-muted-foreground">(Not configured)</span>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="channel-whatsapp" 
                        checked={alertChannels.includes("WHATSAPP")}
                        onCheckedChange={() => toggleChannel("WHATSAPP")}
                        disabled={!notificationSettings?.whatsappEnabled}
                        data-testid="checkbox-channel-whatsapp"
                      />
                      <Label htmlFor="channel-whatsapp" className="flex items-center gap-2 cursor-pointer">
                        <SiWhatsapp className="w-4 h-4 text-[#25D366]" />
                        WhatsApp
                        {!notificationSettings?.whatsappEnabled && (
                          <span className="text-xs text-muted-foreground">(Not configured)</span>
                        )}
                      </Label>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-xs text-primary"
                    onClick={() => {
                      setAlertDialogOpen(false);
                      setSettingsOpen(true);
                    }}
                    data-testid="button-configure-notifications"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Configure notification channels
                  </Button>
                </div>
                <Button 
                  onClick={handleCreateAlert} 
                  className="w-full"
                  disabled={createAlertMutation.isPending}
                  data-testid="button-submit-alert"
                >
                  {createAlertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Alert"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Notification Settings Dialog */}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Notification Settings</DialogTitle>
                <DialogDescription>
                  Configure Telegram and WhatsApp to receive price alerts on your phone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <SiTelegram className="w-6 h-6 text-[#0088cc]" />
                    <div className="flex-1">
                      <h4 className="font-medium">Telegram</h4>
                      <p className="text-xs text-muted-foreground">Receive alerts via Telegram bot</p>
                    </div>
                    <Checkbox 
                      checked={notificationSettings?.telegramEnabled ?? false}
                      onCheckedChange={(checked) => {
                        updateNotificationSettingsMutation.mutate({
                          telegramEnabled: checked as boolean,
                          telegramChatId: notificationSettings?.telegramChatId,
                        });
                      }}
                      data-testid="toggle-telegram"
                    />
                  </div>
                  {notificationSettings?.telegramEnabled && (
                    <div className="pl-9">
                      <label className="text-sm font-medium">Telegram Chat ID</label>
                      <Input
                        placeholder="Your chat ID from @userinfobot"
                        defaultValue={notificationSettings?.telegramChatId || ""}
                        onBlur={(e) => {
                          if (e.target.value !== notificationSettings?.telegramChatId) {
                            updateNotificationSettingsMutation.mutate({
                              telegramEnabled: true,
                              telegramChatId: e.target.value,
                            });
                          }
                        }}
                        data-testid="input-telegram-chat-id"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Message @userinfobot on Telegram to get your Chat ID
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <SiWhatsapp className="w-6 h-6 text-[#25D366]" />
                    <div className="flex-1">
                      <h4 className="font-medium">WhatsApp</h4>
                      <p className="text-xs text-muted-foreground">Receive alerts via WhatsApp (requires Twilio)</p>
                    </div>
                    <Checkbox 
                      checked={notificationSettings?.whatsappEnabled ?? false}
                      onCheckedChange={(checked) => {
                        updateNotificationSettingsMutation.mutate({
                          whatsappEnabled: checked as boolean,
                          whatsappNumber: notificationSettings?.whatsappNumber,
                        });
                      }}
                      data-testid="toggle-whatsapp"
                    />
                  </div>
                  {notificationSettings?.whatsappEnabled && (
                    <div className="pl-9">
                      <label className="text-sm font-medium">WhatsApp Phone Number</label>
                      <Input
                        placeholder="+1234567890"
                        defaultValue={notificationSettings?.whatsappNumber || ""}
                        onBlur={(e) => {
                          if (e.target.value !== notificationSettings?.whatsappNumber) {
                            updateNotificationSettingsMutation.mutate({
                              whatsappEnabled: true,
                              whatsappNumber: e.target.value,
                            });
                          }
                        }}
                        data-testid="input-whatsapp-number"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Include country code (e.g., +1 for US)
                      </p>
                    </div>
                  )}
                </div>

                {/* 2FA Security Reminder */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-6 h-6 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium">Two-Factor Authentication (2FA)</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Protect your account by enabling 2FA on your login provider (Google, GitHub, etc.). 
                        This adds an extra layer of security to your stockwhisperer.AI account.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <a 
                          href="https://myaccount.google.com/signinoptions/two-step-verification" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          data-testid="link-google-2fa"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Google 2FA
                        </a>
                        <a 
                          href="https://github.com/settings/security" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          data-testid="link-github-2fa"
                        >
                          <ExternalLink className="w-3 h-3" />
                          GitHub 2FA
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Stock Chart Dialog */}
      <StockChart 
        symbol={chartSymbol} 
        open={chartOpen} 
        onOpenChange={setChartOpen} 
      />
    </div>
  );
}
