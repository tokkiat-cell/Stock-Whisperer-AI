import express, { type Express, type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('DATABASE_URL not set, skipping Stripe initialization');
    return false;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${(process.env.REPLIT_DOMAINS ?? process.env.VERCEL_URL)?.split(',')[0]}`;
    try {
      const result = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`);
      if (result?.webhook?.url) {
        console.log(`Webhook configured: ${result.webhook.url}`);
      } else {
        console.log('Webhook configured (no URL returned)');
      }
    } catch (webhookError) {
      console.warn('Could not set up managed webhook:', webhookError);
    }

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => {
        console.log('Stripe data synced');
      })
      .catch((err: any) => {
        console.error('Error syncing Stripe data:', err);
      });

    // Validate Stripe price IDs are configured
    if (!process.env.STRIPE_BASIC_PRICE_ID || !process.env.STRIPE_PRO_PRICE_ID) {
      console.warn('Warning: STRIPE_BASIC_PRICE_ID and/or STRIPE_PRO_PRICE_ID not set.');
      console.warn('Run "npx tsx server/scripts/seedStripeProducts.ts" to create products.');
    } else {
      console.log('Stripe price IDs configured.');
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return false;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Builds and wires up the Express app: Stripe webhook, body parsing, request
 * logging, all routes, and the error handler. Shared by the persistent
 * server entrypoint (server/index.ts) and the Vercel serverless entrypoint
 * (api/index.ts) so the two never drift apart.
 *
 * `httpServer` is only needed for Vite's dev-mode HMR websocket; pass the
 * real listening server in dev, omit it in production/serverless where a
 * throwaway one (never listened on) satisfies registerRoutes' signature.
 *
 * `serveStaticFiles` controls whether this app serves the built client
 * itself (Render/Docker, where one process serves both API and static
 * assets) or leaves that to something else (Vercel, where the platform
 * serves `dist/public` directly and this function only ever sees `/api/*`
 * requests — `dist/public` won't even exist inside the function's bundle).
 */
export async function configureApp(
  app: Express,
  httpServer?: Server,
  serveStaticFiles = true,
): Promise<Express> {
  await initStripe();

  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];

      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature' });
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;

        if (!Buffer.isBuffer(req.body)) {
          console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
          return res.status(500).json({ error: 'Webhook processing error' });
        }

        await WebhookHandlers.processWebhook(req.body as Buffer, sig);

        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error('Webhook error:', error.message);
        res.status(400).json({ error: 'Webhook processing error' });
      }
    }
  );

  app.use(
    express.json({
      limit: '50mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  const routesServer = httpServer ?? createServer(app);
  await registerRoutes(routesServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    if (serveStaticFiles) {
      serveStatic(app);
    }
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(routesServer, app);
  }

  return app;
}
