import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Trash2, Target, RefreshCw, TrendingUp, TrendingDown, FileSpreadsheet } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GrowthStockTarget {
  id: number;
  userId: string;
  category: string;
  symbol: string;
  company: string;
  currency: string;
  supportLevel1: string | null;
  supportLevel2: string | null;
  supportLevel3: string | null;
  supportLevel4: string | null;
  supportLevel5: string | null;
  lastPrice: string | null;
  conservativeIv: string | null;
  baseIv: string | null;
  averageIv: string | null;
  discountPremium: string | null;
  growthRate: string | null;
  moat: string | null;
  investmentType: string | null;
  createdAt: string | null;
}

export default function GrowthTargets() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { data: targets = [], isLoading } = useQuery<GrowthStockTarget[]>({
    queryKey: ["/api/growth-targets"],
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (items: any[]) => {
      return apiRequest("POST", "/api/growth-targets/bulk", items);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-targets"] });
      toast({ title: `${variables.length} growth stocks imported` });
      setIsImporting(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to import stocks", description: err.message, variant: "destructive" });
      setIsImporting(false);
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/growth-targets/all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-targets"] });
      toast({ title: "All growth targets cleared" });
    },
    onError: () => {
      toast({ title: "Failed to clear targets", variant: "destructive" });
    },
  });

  const parseValue = (val: string): string | null => {
    if (!val || val.trim() === "" || val.trim().toUpperCase() === "N/A" || val.trim() === "#VALUE!") {
      return null;
    }
    return val.trim().replace(/[%$,]/g, "");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim());
        const items: any[] = [];

        if (lines.length < 3) {
          toast({ title: "File appears to be empty or missing data rows", variant: "destructive" });
          setIsImporting(false);
          return;
        }

        let headerIdx = 0;
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          if (lines[i].toLowerCase().includes("ticker") && lines[i].toLowerCase().includes("company")) {
            headerIdx = i;
            break;
          }
        }

        const headers = lines[headerIdx].split(",").map(h => h.toLowerCase().replace(/"/g, "").trim());
        const categoryIdx = headers.findIndex(h => h.includes("adam") || h.includes("list") || h === "category");
        const tickerIdx = headers.findIndex(h => h === "ticker" || h === "symbol");
        const companyIdx = headers.findIndex(h => h === "company" || h === "name");
        const currencyIdx = headers.findIndex(h => h === "currency");
        const support1Idx = headers.findIndex(h => h.includes("support") && h.includes("1"));
        const support2Idx = headers.findIndex(h => h.includes("support") && h.includes("2"));
        const support3Idx = headers.findIndex(h => h.includes("support") && h.includes("3"));
        const support4Idx = headers.findIndex(h => h.includes("support") && h.includes("4"));
        const support5Idx = headers.findIndex(h => h.includes("support") && h.includes("5"));
        const lastPriceIdx = headers.findIndex(h => h.includes("last") && h.includes("price"));
        const conservativeIdx = headers.findIndex(h => h.includes("conservative"));
        const baseIvIdx = headers.findIndex(h => h.includes("base") && h.includes("iv"));
        const averageIvIdx = headers.findIndex(h => h.includes("average") && h.includes("iv"));
        const discountIdx = headers.findIndex(h => h.includes("discount") || h.includes("premium"));
        const growthIdx = headers.findIndex(h => h.includes("growth"));
        const moatIdx = headers.findIndex(h => h === "moat");
        const investmentIdx = headers.findIndex(h => h.includes("investment") && h.includes("type"));

        for (let i = headerIdx + 1; i < lines.length; i++) {
          const parts = lines[i].split(",").map(p => p.trim().replace(/^"|"$/g, ""));
          
          if (parts.length < 3) continue;

          const ticker = tickerIdx >= 0 ? parts[tickerIdx] : "";
          if (!ticker || ticker.length === 0) continue;

          const symbol = ticker.replace(/-US$|-HK$/, "");
          const category = categoryIdx >= 0 ? parts[categoryIdx] : "US";

          items.push({
            category: category || "US",
            symbol: symbol.toUpperCase(),
            company: companyIdx >= 0 ? parts[companyIdx] || "" : "",
            currency: currencyIdx >= 0 ? parts[currencyIdx] || "USD" : "USD",
            supportLevel1: support1Idx >= 0 ? parseValue(parts[support1Idx]) : null,
            supportLevel2: support2Idx >= 0 ? parseValue(parts[support2Idx]) : null,
            supportLevel3: support3Idx >= 0 ? parseValue(parts[support3Idx]) : null,
            supportLevel4: support4Idx >= 0 ? parseValue(parts[support4Idx]) : null,
            supportLevel5: support5Idx >= 0 ? parseValue(parts[support5Idx]) : null,
            lastPrice: lastPriceIdx >= 0 ? parseValue(parts[lastPriceIdx]) : null,
            conservativeIv: conservativeIdx >= 0 ? parseValue(parts[conservativeIdx]) : null,
            baseIv: baseIvIdx >= 0 ? parseValue(parts[baseIvIdx]) : null,
            averageIv: averageIvIdx >= 0 ? parseValue(parts[averageIvIdx]) : null,
            discountPremium: discountIdx >= 0 ? parseValue(parts[discountIdx]) : null,
            growthRate: growthIdx >= 0 ? parseValue(parts[growthIdx]) : null,
            moat: moatIdx >= 0 ? parts[moatIdx] || null : null,
            investmentType: investmentIdx >= 0 ? parts[investmentIdx] || null : null,
          });
        }

        if (items.length > 0) {
          bulkImportMutation.mutate(items);
        } else {
          toast({ title: "No valid data found in file", variant: "destructive" });
          setIsImporting(false);
        }
      } catch (error) {
        toast({ title: "Failed to parse file", variant: "destructive" });
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const groupedTargets = targets.reduce((acc, target) => {
    const cat = target.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(target);
    return acc;
  }, {} as Record<string, GrowthStockTarget[]>);

  const categories = Object.keys(groupedTargets).sort((a, b) => {
    if (a === "Favorite") return -1;
    if (b === "Favorite") return 1;
    return a.localeCompare(b);
  });

  const getDiscountColor = (discount: string | null) => {
    if (!discount) return "text-muted-foreground";
    const val = parseFloat(discount);
    if (val > 20) return "text-green-500";
    if (val > 0) return "text-green-400";
    if (val > -20) return "text-yellow-500";
    return "text-red-500";
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
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-growth-targets">
            <Target className="h-6 w-6 text-primary" />
            Growth Stock Targets
          </h1>
          <p className="text-muted-foreground">
            Track growth stocks with support levels, intrinsic values, and moat ratings
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            data-testid="button-upload-csv"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import CSV
          </Button>

          {targets.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" data-testid="button-clear-all">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all growth targets?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {targets.length} growth stock targets. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteAllMutation.mutate()}>
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{targets.length}</div>
            <div className="text-sm text-muted-foreground">Total Stocks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {targets.filter(t => t.discountPremium && parseFloat(t.discountPremium) < 0).length}
            </div>
            <div className="text-sm text-muted-foreground">Undervalued</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">
              {targets.filter(t => t.discountPremium && parseFloat(t.discountPremium) > 20).length}
            </div>
            <div className="text-sm text-muted-foreground">Overvalued ({">"} 20%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{categories.length}</div>
            <div className="text-sm text-muted-foreground">Categories</div>
          </CardContent>
        </Card>
      </div>

      {targets.length === 0 ? (
        <Card className="p-8 text-center" data-testid="card-no-targets">
          <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Growth Targets</h3>
          <p className="text-muted-foreground mb-4">
            Import your growth stock list from a CSV file to get started.
          </p>
          <p className="text-sm text-muted-foreground">
            CSV should have columns: Category, Ticker, Company, Currency, Support Levels 1-5, IV values, Growth Rate, Moat, Investment Type
          </p>
        </Card>
      ) : (
        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="flex-wrap h-auto">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} data-testid={`tab-${cat.toLowerCase()}`}>
                {cat} ({groupedTargets[cat].length})
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat} value={cat} className="mt-4">
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-right">Last Price</TableHead>
                        <TableHead className="text-right">Avg IV</TableHead>
                        <TableHead className="text-right">Discount/Premium</TableHead>
                        <TableHead className="text-right">Growth</TableHead>
                        <TableHead>Moat</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Support 1</TableHead>
                        <TableHead className="text-right">Support 2</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedTargets[cat].map(target => (
                        <TableRow key={target.id} data-testid={`row-${target.symbol}`}>
                          <TableCell className="font-mono font-bold">{target.symbol}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{target.company}</TableCell>
                          <TableCell className="text-right font-mono">
                            {target.currency} {target.lastPrice || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {target.averageIv || "-"}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${getDiscountColor(target.discountPremium)}`}>
                            {target.discountPremium ? `${target.discountPremium}%` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {target.growthRate ? `${target.growthRate}%` : "-"}
                          </TableCell>
                          <TableCell>
                            {target.moat && target.moat !== "N/A" && target.moat !== "NA" ? (
                              <Badge variant="outline" className={
                                target.moat === "Wide" ? "border-green-500 text-green-500" :
                                target.moat === "Narrow" ? "border-yellow-500 text-yellow-500" :
                                ""
                              }>
                                {target.moat}
                              </Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {target.investmentType || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {target.supportLevel1 || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {target.supportLevel2 || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
