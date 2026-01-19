import { z } from 'zod';
import { insertTradeSetupSchema, tradeSetups } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  stocks: {
    search: {
      method: 'GET' as const,
      path: '/api/stocks/search',
      input: z.object({ query: z.string() }),
      responses: {
        200: z.array(z.object({
          symbol: z.string(),
          name: z.string(),
        })),
      },
    },
    quote: {
      method: 'GET' as const,
      path: '/api/stocks/:symbol/quote',
      responses: {
        200: z.object({
          symbol: z.string(),
          price: z.number(),
          change: z.number(),
          changePercent: z.number(),
          companyName: z.string().optional(),
        }),
        404: errorSchemas.notFound,
      },
    },
  },
  analysis: {
    analyze: {
      method: 'POST' as const,
      path: '/api/analysis/analyze',
      input: z.object({ symbol: z.string() }),
      responses: {
        200: z.object({
          symbol: z.string(),
          recommendation: z.enum(["BUY", "SELL", "HOLD"]),
          entryPrice: z.number(),
          takeProfit: z.number(),
          stopLoss: z.number(),
          rationale: z.string(),
          confidence: z.number(),
        }),
      },
    },
  },
  trades: {
    list: {
      method: 'GET' as const,
      path: '/api/trades',
      responses: {
        200: z.array(z.custom<typeof tradeSetups.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/trades',
      input: insertTradeSetupSchema,
      responses: {
        201: z.custom<typeof tradeSetups.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/trades/:id/status',
      input: z.object({ status: z.enum(["EXECUTED", "REJECTED"]) }),
      responses: {
        200: z.custom<typeof tradeSetups.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/trades/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  sp500: {
    list: {
      method: 'GET' as const,
      path: '/api/sp500',
      responses: {
        200: z.array(z.object({
          symbol: z.string(),
          name: z.string(),
          lastPrice: z.string().nullable(),
        })),
      },
    },
    recommendations: {
      method: 'GET' as const,
      path: '/api/sp500/recommendations',
      responses: {
        200: z.array(z.object({
          symbol: z.string(),
          recommendation: z.string(),
          entryPrice: z.string(),
          takeProfit: z.string(),
          stopLoss: z.string(),
          riskReward: z.string(),
          rationale: z.string(),
        })),
      },
    },
    scan: {
      method: 'POST' as const,
      path: '/api/sp500/scan',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  market: {
    premarketMovers: {
      method: 'GET' as const,
      path: '/api/market/premarket-movers',
      responses: {
        200: z.array(z.object({
          symbol: z.string(),
          name: z.string(),
          price: z.number(),
          change: z.number(),
          changePercent: z.number(),
        })),
      },
    },
  },
  dashboard: {
    chat: {
      method: 'POST' as const,
      path: '/api/dashboard/chat',
      input: z.object({ message: z.string() }),
      responses: {
        200: z.object({ response: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
