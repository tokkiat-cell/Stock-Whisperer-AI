import { z } from 'zod';
import { insertTradeSetupSchema, tradeSetups, insertPortfolioHoldingSchema, portfolioHoldings, insertWatchlistSchema, watchlist } from './schema';

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
          candlePattern: z.string().optional(),
          trendType: z.string().optional(),
          movingAverages: z.object({
            ma20: z.string(),
            ma40: z.string(),
            ma100: z.string(),
            ma150: z.string(),
            ma200: z.string(),
          }).optional(),
          technicalSummary: z.string().optional(),
          positionSize: z.string().optional(),
          riskAmount: z.string().optional(),
        })),
      },
    },
    scan: {
      method: 'POST' as const,
      path: '/api/sp500/scan',
      input: z.object({
        riskAmount: z.number().optional(),
        timeframe: z.enum(["day", "month", "swing", "longterm"]).optional(),
      }),
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
  portfolio: {
    list: {
      method: 'GET' as const,
      path: '/api/portfolio',
      responses: {
        200: z.array(z.custom<typeof portfolioHoldings.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/portfolio',
      input: z.object({
        symbol: z.string().min(1).max(10),
        shares: z.string(),
        avgCost: z.string(),
      }),
      responses: {
        201: z.custom<typeof portfolioHoldings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/portfolio/:id',
      input: z.object({
        shares: z.string(),
        avgCost: z.string(),
      }),
      responses: {
        200: z.custom<typeof portfolioHoldings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/portfolio/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    bulkCreate: {
      method: 'POST' as const,
      path: '/api/portfolio/bulk',
      input: z.object({
        holdings: z.array(z.object({
          symbol: z.string().min(1).max(10),
          shares: z.string(),
          avgCost: z.string(),
        })),
      }),
      responses: {
        201: z.array(z.custom<typeof portfolioHoldings.$inferSelect>()),
        400: errorSchemas.validation,
      },
    },
  },
  watchlist: {
    list: {
      method: 'GET' as const,
      path: '/api/watchlist',
      responses: {
        200: z.array(z.custom<typeof watchlist.$inferSelect>()),
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/watchlist',
      input: z.object({
        symbol: z.string().min(1).max(10),
        notes: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof watchlist.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateNote: {
      method: 'PATCH' as const,
      path: '/api/watchlist/:id',
      input: z.object({
        notes: z.string(),
      }),
      responses: {
        200: z.custom<typeof watchlist.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/watchlist/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    bulkAdd: {
      method: 'POST' as const,
      path: '/api/watchlist/bulk',
      input: z.object({
        symbols: z.array(z.string().min(1).max(10)),
      }),
      responses: {
        201: z.array(z.custom<typeof watchlist.$inferSelect>()),
        400: errorSchemas.validation,
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
