import { z } from 'zod';
import { insertTradeSetupSchema, tradeSetups, insertPortfolioHoldingSchema, portfolioHoldings, insertWatchlistSchema, watchlist, priceAlerts, userNotificationSettings, ibkrSettings, tradingOrders } from './schema';

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
    history: {
      method: 'GET' as const,
      path: '/api/stocks/:symbol/history',
      responses: {
        200: z.object({
          candles: z.array(z.object({
            time: z.number(),
            open: z.number(),
            high: z.number(),
            low: z.number(),
            close: z.number(),
            volume: z.number().optional(),
          })),
          movingAverages: z.object({
            ma20: z.array(z.object({ time: z.number(), value: z.number() })),
            ma40: z.array(z.object({ time: z.number(), value: z.number() })),
            ma100: z.array(z.object({ time: z.number(), value: z.number() })),
            ma200: z.array(z.object({ time: z.number(), value: z.number() })),
          }),
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
          market: z.string().optional(),
        })),
      },
    },
    premarketScreener: {
      method: 'GET' as const,
      path: '/api/market/premarket-screener',
      responses: {
        200: z.object({
          gainers: z.array(z.object({
            symbol: z.string(),
            name: z.string(),
            price: z.number(),
            change: z.number(),
            changePercent: z.number(),
            volume: z.number().optional(),
          })),
          losers: z.array(z.object({
            symbol: z.string(),
            name: z.string(),
            price: z.number(),
            change: z.number(),
            changePercent: z.number(),
            volume: z.number().optional(),
          })),
        }),
      },
    },
    cupidScanner: {
      method: 'GET' as const,
      path: '/api/market/cupid-scanner',
      responses: {
        200: z.array(z.object({
          symbol: z.string(),
          name: z.string(),
          currentPrice: z.number(),
          patternDetected: z.boolean(),
          confidence: z.number(),
          uptrendStrength: z.number(),
          pullbackDepth: z.number(),
          pullbackSmoothness: z.number(),
          pullbackAngle: z.number(),
          swingHigh: z.number(),
          swingLow: z.number(),
          entryZone: z.object({
            low: z.number(),
            high: z.number(),
          }),
          stopLoss: z.number(),
          targetPrice: z.number(),
          riskRewardRatio: z.number(),
          details: z.array(z.string()),
        })),
      },
    },
    powerRangerScanner: {
      method: 'GET' as const,
      path: '/api/market/powerranger-scanner',
      responses: {
        200: z.object({
          matches: z.array(z.object({
            symbol: z.string(),
            name: z.string(),
            currentPrice: z.number(),
            patternDetected: z.boolean(),
            confidence: z.number(),
            gapPercent: z.number(),
            gapQualityScore: z.number(),
            relativeStrength: z.number(),
            rangeHigh: z.number(),
            rangeLow: z.number(),
            entryLevel: z.number(),
            stopLoss: z.number(),
            targetPrice: z.number(),
            roomToTarget: z.number(),
            riskRewardRatio: z.number(),
            shockValue: z.string(),
            details: z.array(z.string()),
          })),
          totalScanned: z.number(),
          scanTime: z.number(),
        }),
      },
    },
    indices: {
      method: 'GET' as const,
      path: '/api/market/indices',
      responses: {
        200: z.array(z.object({
          symbol: z.string(),
          name: z.string(),
          price: z.number(),
          change: z.number(),
          changePercent: z.number(),
          previousClose: z.number(),
          market: z.enum(['US', 'SG', 'HK', 'CN', 'EU']),
        })),
      },
    },
    preferences: {
      method: 'GET' as const,
      path: '/api/market/preferences',
      responses: {
        200: z.object({
          selectedIndices: z.array(z.string()),
          selectedStocks: z.array(z.string()),
          showUSMarket: z.boolean(),
          showSGMarket: z.boolean(),
          showHKMarket: z.boolean(),
          showCNMarket: z.boolean(),
          showEUMarket: z.boolean(),
          selectedMoversMarket: z.string(),
        }),
      },
    },
    updatePreferences: {
      method: 'PUT' as const,
      path: '/api/market/preferences',
      input: z.object({
        selectedIndices: z.array(z.string()).optional(),
        selectedStocks: z.array(z.string()).optional(),
        showUSMarket: z.boolean().optional(),
        showSGMarket: z.boolean().optional(),
        showHKMarket: z.boolean().optional(),
        showCNMarket: z.boolean().optional(),
        showEUMarket: z.boolean().optional(),
        selectedMoversMarket: z.string().optional(),
      }),
      responses: {
        200: z.object({
          selectedIndices: z.array(z.string()),
          selectedStocks: z.array(z.string()),
          showUSMarket: z.boolean(),
          showSGMarket: z.boolean(),
          showHKMarket: z.boolean(),
          showCNMarket: z.boolean(),
          showEUMarket: z.boolean(),
          selectedMoversMarket: z.string(),
        }),
      },
    },
  },
  dashboard: {
    chat: {
      method: 'POST' as const,
      path: '/api/dashboard/chat',
      input: z.object({ 
        message: z.string(),
        imageBase64: z.string().optional(),
      }),
      responses: {
        200: z.object({ response: z.string() }),
      },
    },
  },
  portfolio: {
    extractFromImage: {
      method: 'POST' as const,
      path: '/api/portfolio/extract-from-image',
      input: z.object({ imageBase64: z.string() }),
      responses: {
        200: z.object({ symbols: z.array(z.string()) }),
      },
    },
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
  savedPrompts: {
    list: {
      method: 'GET' as const,
      path: '/api/saved-prompts',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          userId: z.string(),
          title: z.string(),
          prompt: z.string(),
          createdAt: z.date().nullable(),
        })),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/saved-prompts',
      input: z.object({
        title: z.string().min(1).max(100),
        prompt: z.string().min(1),
      }),
      responses: {
        201: z.object({
          id: z.number(),
          userId: z.string(),
          title: z.string(),
          prompt: z.string(),
          createdAt: z.date().nullable(),
        }),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/saved-prompts/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  priceAlerts: {
    list: {
      method: 'GET' as const,
      path: '/api/price-alerts',
      responses: {
        200: z.array(z.custom<typeof priceAlerts.$inferSelect>()),
      },
    },
    listBySymbol: {
      method: 'GET' as const,
      path: '/api/price-alerts/symbol/:symbol',
      responses: {
        200: z.array(z.custom<typeof priceAlerts.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/price-alerts',
      input: z.object({
        symbol: z.string().min(1).max(10),
        targetPrice: z.string(),
        direction: z.enum(['ABOVE', 'BELOW']),
        alertType: z.enum(['PRICE', 'AI_MODEL']),
        notifyChannels: z.array(z.enum(['APP', 'TELEGRAM', 'WHATSAPP'])).optional(),
        isActive: z.boolean().optional(),
      }),
      responses: {
        201: z.custom<typeof priceAlerts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/price-alerts/:id',
      input: z.object({
        targetPrice: z.string().optional(),
        direction: z.enum(['ABOVE', 'BELOW']).optional(),
        isActive: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof priceAlerts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/price-alerts/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    triggered: {
      method: 'GET' as const,
      path: '/api/price-alerts/triggered',
      responses: {
        200: z.array(z.custom<typeof priceAlerts.$inferSelect>()),
      },
    },
    checkAlerts: {
      method: 'POST' as const,
      path: '/api/price-alerts/check',
      responses: {
        200: z.object({
          checked: z.number(),
          triggered: z.number(),
          alerts: z.array(z.custom<typeof priceAlerts.$inferSelect>()),
        }),
      },
    },
    dismissTriggered: {
      method: 'POST' as const,
      path: '/api/price-alerts/:id/dismiss',
      responses: {
        200: z.custom<typeof priceAlerts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  notificationSettings: {
    get: {
      method: 'GET' as const,
      path: '/api/notification-settings',
      responses: {
        200: z.custom<typeof userNotificationSettings.$inferSelect>().nullable(),
      },
    },
    update: {
      method: 'POST' as const,
      path: '/api/notification-settings',
      input: z.object({
        telegramChatId: z.string().optional().nullable(),
        telegramEnabled: z.boolean().optional(),
        whatsappNumber: z.string().optional().nullable(),
        whatsappEnabled: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof userNotificationSettings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  ibkr: {
    settings: {
      get: {
        method: 'GET' as const,
        path: '/api/ibkr/settings',
        responses: {
          200: z.custom<typeof ibkrSettings.$inferSelect>().nullable(),
        },
      },
      update: {
        method: 'POST' as const,
        path: '/api/ibkr/settings',
        input: z.object({
          host: z.string().min(1).max(100).optional(),
          port: z.number().int().min(1).max(65535).optional(),
          clientId: z.number().int().min(0).optional(),
        }),
        responses: {
          200: z.custom<typeof ibkrSettings.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
    },
    testConnection: {
      method: 'POST' as const,
      path: '/api/ibkr/test-connection',
      responses: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          error: z.string().optional(),
        }),
      },
    },
  },
  tradingOrders: {
    list: {
      method: 'GET' as const,
      path: '/api/trading-orders',
      responses: {
        200: z.array(z.custom<typeof tradingOrders.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/trading-orders/:id',
      responses: {
        200: z.custom<typeof tradingOrders.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/trading-orders',
      input: z.object({
        symbol: z.string().min(1).max(10),
        action: z.enum(['BUY', 'SELL']),
        orderType: z.enum(['LIMIT', 'MARKET', 'STOP']),
        quantity: z.number().int().min(1),
        entryPrice: z.string(),
        stopLoss: z.string().optional().nullable(),
        takeProfit: z.string().optional().nullable(),
        sourceRecommendationId: z.number().optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
      responses: {
        201: z.custom<typeof tradingOrders.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/trading-orders/:id',
      input: z.object({
        entryPrice: z.string().optional(),
        stopLoss: z.string().optional().nullable(),
        takeProfit: z.string().optional().nullable(),
        quantity: z.number().int().min(1).optional(),
        notes: z.string().optional().nullable(),
      }),
      responses: {
        200: z.custom<typeof tradingOrders.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/trading-orders/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    submit: {
      method: 'POST' as const,
      path: '/api/trading-orders/:id/submit',
      responses: {
        200: z.object({
          success: z.boolean(),
          orderId: z.number().optional(),
          ibkrOrderId: z.number().optional(),
          message: z.string(),
          error: z.string().optional(),
        }),
        404: errorSchemas.notFound,
      },
    },
    cancel: {
      method: 'POST' as const,
      path: '/api/trading-orders/:id/cancel',
      responses: {
        200: z.object({
          success: z.boolean(),
          orderId: z.number().optional(),
          message: z.string(),
          error: z.string().optional(),
        }),
        404: errorSchemas.notFound,
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
