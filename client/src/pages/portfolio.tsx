import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Wallet, Plus, Upload, Clipboard, Trash2, Loader2, Eye, 
  DollarSign, TrendingUp, BarChart3, Activity, FileSpreadsheet
} from "lucide-react";
import type { PortfolioHolding, WatchlistItem } from "@shared/schema";

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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: holdings = [], isLoading: holdingsLoading } = useQuery<PortfolioHolding[]>({
    queryKey: ["/api/portfolio"],
  });

  const { data: watchlist = [], isLoading: watchlistLoading } = useQuery<WatchlistItem[]>({
    queryKey: ["/api/watchlist"],
  });

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
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
      
      const holdings: Array<{ symbol: string; shares: string; avgCost: string }> = [];
      for (let i = 0; i < json.length; i++) {
        const row = json[i];
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

            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-import-holdings">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Import Portfolio Holdings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                    <div className="font-semibold text-primary">{holding.symbol}</div>
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
              {watchlist.map((item) => (
                <Card key={item.id} className="p-4" data-testid={`watchlist-${item.symbol}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg text-primary">{item.symbol}</h4>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Added {new Date(item.createdAt!).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWatchlistMutation.mutate(item.id)}
                      data-testid={`button-delete-watch-${item.symbol}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
