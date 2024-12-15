import express, { Request, Response } from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createApiRouter } from "./routes/api";
import { OllamaService } from "./services/ollama";
import { IncomingMessage, ServerResponse } from "http";

// Extend Request type to include our custom properties
interface ExtendedRequest extends IncomingMessage {
  path?: string;
  startTime?: number;
  method?: string;
}

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_PORT = process.env.OLLAMA_PORT || 11434;

app.use(cors());
app.use(express.json());

// Create and mount API routes
app.use("/api", createApiRouter(Number(OLLAMA_PORT), Number(PORT)));

// Proxy /api/ollama requests to Ollama server
app.use(
  "/api/ollama",
  createProxyMiddleware({
    target: `http://localhost:${OLLAMA_PORT}`,
    pathRewrite: {
      "^/api/ollama": "", // Remove /api/ollama prefix when forwarding
    },
    changeOrigin: true,
    // Add detailed logging with proper types
    onProxyReq: (proxyReq: IncomingMessage, req: ExtendedRequest) => {
      const startTime = Date.now();
      req.startTime = startTime;
      process.stdout.write(
        `[PROXY REQUEST] ${req.method} ${req.path}
        Time: ${new Date(startTime).toISOString()}
        Target: ${OLLAMA_PORT}\n`
      );
    },
    onProxyRes: (proxyRes: IncomingMessage, req: ExtendedRequest) => {
      const duration = Date.now() - (req.startTime || 0);
      process.stdout.write(`[PROXY RESPONSE] ${req.method} ${req.path}
        Status: ${proxyRes.statusCode}
        Duration: ${duration}ms
        Time: ${new Date().toISOString()}
        Target: ${OLLAMA_PORT}\n`);
    },
    onError: (err: Error, req: ExtendedRequest, res: ServerResponse) => {
      const duration = Date.now() - (req.startTime || 0);
      process.stderr.write(`[PROXY ERROR] ${req.method} ${req.path}
        Error: ${err.message}
        Code: ${(err as any).code}
        Duration: ${duration}ms
        Time: ${new Date().toISOString()}
        Target: ${OLLAMA_PORT}
        Stack: ${err.stack || "No stack trace"}\n`);
      if (!res.headersSent) {
        res.writeHead(504, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Proxy Error",
            message: err.message,
            code: (err as any).code,
            duration: duration,
          })
        );
      }
    },
  } as any) // Type assertion needed due to http-proxy-middleware types limitation
);

const startServer = async () => {
  try {
    // Initialize Ollama service and start Ollama
    const ollamaService = new OllamaService(Number(OLLAMA_PORT));
    await ollamaService.start();

    app.listen(PORT, () => {
      process.stdout.write(`[SERVER START] Server running on port ${PORT}\n`);
      process.stdout.write(
        `[SERVER START] Ollama running on port ${OLLAMA_PORT}\n`
      );
    });
  } catch (error) {
    process.stderr.write(`[SERVER ERROR] Failed to start server: ${error}\n`);
    process.exit(1);
  }
};

startServer();
