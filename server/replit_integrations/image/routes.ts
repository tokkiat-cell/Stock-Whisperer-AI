import type { Express, Request, Response } from "express";
import { openai } from "./client";
import { isAuthenticated } from "../auth";
import { checkUsageLimit, incrementUsage } from "../../lib/usageLimits";

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      // @ts-ignore
      const userId = req.user.claims.sub;

      const usageCheck = await checkUsageLimit(userId, "image");
      if (!usageCheck.allowed) {
        return res.status(403).json({ 
          error: "Free tier limit reached",
          usageType: "image",
          currentCount: usageCheck.currentCount,
          limit: usageCheck.limit,
          requiresUpgrade: true
        });
      }

      const { prompt, size = "1024x1024" } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: size as "1024x1024" | "512x512" | "256x256",
      });

      const imageData = response.data[0];
      
      await incrementUsage(userId, "image");
      
      res.json({
        url: imageData.url,
        b64_json: imageData.b64_json,
      });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });
}

