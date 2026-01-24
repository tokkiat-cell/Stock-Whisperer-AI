import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, ArrowUp, ArrowDown, LineChart } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PremarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

interface PremarketData {
  gainers: PremarketMover[];
  losers: PremarketMover[];
}

export default function Premarket() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setLocation] = useLocation();

  const handleAnalyzeSymbol = (symbol: string) => {
    setLocation(`/analysis?symbol=${symbol}`);
  };

  const { data: premarketData, isLoading } = useQuery<PremarketData>({
    queryKey: ["/api/market/premarket-screener"],
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/market/premarket-screener"] });
    setIsRefreshing(false);
  };

  const formatVolume = (volume?: number) => {
    if (!volume) return "-";
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(0)}K`;
    return volume.toString();
  };

  const MoverTable = ({ movers, type }: { movers: PremarketMover[]; type: "gainers" | "losers" }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Symbol</TableHead>
          <TableHead className="hidden md:table-cell">Company</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Change</TableHead>
          <TableHead className="text-right">% Change</TableHead>
          <TableHead className="text-right hidden sm:table-cell">Volume</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movers.map((mover, idx) => (
          <TableRow key={mover.symbol} data-testid={`row-${type}-${mover.symbol}`}>
            <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
            <TableCell>
              <button
                onClick={() => handleAnalyzeSymbol(mover.symbol)}
                className="font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
                data-testid={`button-analyze-${mover.symbol}`}
              >
                {mover.symbol}
                <LineChart className="w-3 h-3" />
              </button>
            </TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
              {mover.name}
            </TableCell>
            <TableCell className="text-right font-mono">
              ${mover.price.toFixed(2)}
            </TableCell>
            <TableCell className={`text-right font-mono ${type === "gainers" ? "text-green-500" : "text-red-500"}`}>
              {type === "gainers" ? "+" : ""}{mover.change.toFixed(2)}
            </TableCell>
            <TableCell className="text-right">
              <Badge 
                variant={type === "gainers" ? "default" : "destructive"}
                className={type === "gainers" ? "bg-green-500/20 text-green-500 border-green-500/30" : ""}
              >
                {type === "gainers" ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                {Math.abs(mover.changePercent).toFixed(2)}%
              </Badge>
            </TableCell>
            <TableCell className="text-right hidden sm:table-cell text-muted-foreground font-mono">
              {formatVolume(mover.volume)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

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
            <TrendingUp className="h-6 w-6 text-primary" />
            Premarket Changes
          </h1>
          <p className="text-muted-foreground">
            Top 20 daily gainers and losers by percentage change
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          data-testid="button-refresh-premarket"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-500">
              <TrendingUp className="h-5 w-5" />
              Top 20 Gainers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {premarketData?.gainers && premarketData.gainers.length > 0 ? (
              <MoverTable movers={premarketData.gainers} type="gainers" />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No gainers data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-500">
              <TrendingDown className="h-5 w-5" />
              Top 20 Losers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {premarketData?.losers && premarketData.losers.length > 0 ? (
              <MoverTable movers={premarketData.losers} type="losers" />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No losers data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
