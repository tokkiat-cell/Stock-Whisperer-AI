import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateTradeRequest, type UpdateTradeStatusRequest } from "@shared/routes";
import { z } from "zod";

// ============================================
// STOCKS & ANALYSIS
// ============================================

export function useStockQuote(symbol: string) {
  return useQuery({
    queryKey: [api.stocks.quote.path, symbol],
    queryFn: async () => {
      if (!symbol) return null;
      const url = buildUrl(api.stocks.quote.path, { symbol });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) throw new Error("Stock not found");
      if (!res.ok) throw new Error("Failed to fetch quote");
      return api.stocks.quote.responses[200].parse(await res.json());
    },
    enabled: !!symbol && symbol.length > 0,
    retry: false,
  });
}

export function useAnalyzeStock() {
  return useMutation({
    mutationFn: async (symbol: string) => {
      const res = await fetch(api.analysis.analyze.path, {
        method: api.analysis.analyze.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
        credentials: "include",
      });
      if (!res.ok) throw new Error('Analysis failed');
      return api.analysis.analyze.responses[200].parse(await res.json());
    },
  });
}

// ============================================
// TRADES
// ============================================

export function useTrades() {
  return useQuery({
    queryKey: [api.trades.list.path],
    queryFn: async () => {
      const res = await fetch(api.trades.list.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch trades');
      return api.trades.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTradeRequest) => {
      // Coerce numeric strings to numbers if they come from basic HTML inputs
      // But we are using controlled inputs usually. Zod schema handles it if set up right.
      // The shared schema expects strings for numeric/decimal db types usually, or numbers.
      // Drizzle 'numeric' is string in JS, but Zod might expect string or number depending on definition.
      // Our API definition expects numbers according to schema provided (InsertTradeSetupSchema).
      
      const res = await fetch(api.trades.create.path, {
        method: api.trades.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
           const error = api.trades.create.responses[400].parse(await res.json());
           throw new Error(error.message);
        }
        throw new Error('Failed to create trade setup');
      }
      return api.trades.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.trades.list.path] }),
  });
}

export function useUpdateTradeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number } & UpdateTradeStatusRequest) => {
      const url = buildUrl(api.trades.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.trades.updateStatus.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error('Failed to update status');
      return api.trades.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.trades.list.path] }),
  });
}

export function useDeleteTrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.trades.delete.path, { id });
      const res = await fetch(url, { method: api.trades.delete.method, credentials: "include" });
      if (!res.ok) throw new Error('Failed to delete trade');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.trades.list.path] }),
  });
}
