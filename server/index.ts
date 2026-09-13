import express from "express";
import { createServer } from "http";
import { configureApp, log } from "./createApp";

const app = express();
const httpServer = createServer(app);

(async () => {
  await configureApp(app, httpServer);

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      ...(process.platform !== "win32" ? { reusePort: true } : {}),
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
