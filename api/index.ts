import express, { type Express } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { configureApp } from "../server/createApp";

// Vercel serverless functions are stateless per-invocation but the container
// can be reused across invocations (warm start) — cache the configured app
// across calls within the same instance instead of rebuilding it every time.
let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    process.env.NODE_ENV = "production";
    const app = express();
    appPromise = configureApp(app, undefined, false);
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app(req as any, res as any);
}
