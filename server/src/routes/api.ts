import { Router, Request, Response } from "express";
import { OllamaService } from "../services/ollama";
import { ModelService } from "../services/model";
import os from "os";

interface GenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

export function createApiRouter(ollamaPort: number, serverPort: number) {
  const router = Router();
  const ollamaService = new OllamaService(ollamaPort);
  const modelService = new ModelService(ollamaPort);

  // Pull a model
  router.post("/pull", async (req: Request, res: Response): Promise<void> => {
    try {
      const { model } = req.body;

      if (!model) {
        res.status(400).json({ error: "Model name is required" });
        return;
      }

      if (!(await ollamaService.checkRunning())) {
        await ollamaService.start();
      }

      // Let ModelService handle all response headers and progress updates

      const boundary = "PROGRESS_BOUNDARY";
      res.setHeader(
        "Content-Type",
        `multipart/x-mixed-replace; boundary=${boundary}`
      );
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");

      try {
        await modelService.pull(model, res);
        res.write(`--${boundary}\r\n`);
        res.write(`Content-Type: application/json\r\n\r\n`);
        res.write(`{"status":"ready","message":"Model ${model} is ready"}\r\n`);
        res.write(`--${boundary}--\r\n`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        res.write(`--${boundary}\r\n`);
        res.write(`Content-Type: application/json\r\n\r\n`);
        res.write(`{"error":${JSON.stringify(errorMessage)}}\r\n`);
        res.write(`--${boundary}--\r\n`);
      } finally {
        res.end();
      }
    } catch (err) {
      console.error("Error pulling model:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      res.write(`--PROGRESS_BOUNDARY\r\n`);
      res.write(`Content-Type: application/json\r\n\r\n`);
      res.write(`{"error": ${JSON.stringify(errorMessage)}}\r\n`);
      res.write(`--PROGRESS_BOUNDARY--\r\n`);
      res.end();
    }
  });

  // Generate response
  router.post(
    "/generate",
    async (
      req: Request<{}, any, GenerateRequest>,
      res: Response
    ): Promise<void> => {
      try {
        const { model, prompt } = req.body;

        if (!model || !prompt) {
          res.status(400).json({ error: "Model and prompt are required" });
          return;
        }

        if (!(await ollamaService.checkRunning())) {
          await ollamaService.start();
        }

        const boundary = "PROGRESS_BOUNDARY";
        res.setHeader(
          "Content-Type",
          `multipart/x-mixed-replace; boundary=${boundary}`
        );
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // Check if model exists, download if needed
        const modelExists = await modelService.checkExists(model);
        if (!modelExists) {
          await modelService.pull(model, res);
        }

        // Generate response
        const generateResponse = await modelService.generate(model, prompt);
        const reader = generateResponse.body?.getReader();
        if (!reader) throw new Error("No response body");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.trim()) {
              res.write(`--PROGRESS_BOUNDARY\r\n`);
              res.write(`Content-Type: application/json\r\n\r\n`);
              res.write(`${line}\r\n`);
            }
          }
        }

        res.write(`--PROGRESS_BOUNDARY\r\n`);
        res.write(`Content-Type: application/json\r\n\r\n`);
        res.write(`{"done": true}\r\n`);
        res.write(`--PROGRESS_BOUNDARY--\r\n`);
        res.end();
      } catch (err) {
        console.error("Error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        res.write(`--PROGRESS_BOUNDARY\r\n`);
        res.write(`Content-Type: application/json\r\n\r\n`);
        res.write(`{"error": ${JSON.stringify(errorMessage)}}\r\n`);
        res.write(`--PROGRESS_BOUNDARY--\r\n`);
        res.end();
      }
    }
  );

  // Get available models
  router.get("/models", async (_req: Request, res: Response): Promise<void> => {
    try {
      if (!(await ollamaService.checkRunning())) {
        await ollamaService.start();
      }

      const response = await fetch(`http://localhost:${ollamaPort}/api/tags`);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("Error fetching models:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Health check endpoint
  router.get("/health", async (_req: Request, res: Response): Promise<void> => {
    const isRunning = await ollamaService.checkRunning();
    res.json({
      status: "ok",
      ollama: {
        installed: await ollamaService.checkInstalled(),
        running: isRunning,
      },
    });
  });

  // Server info endpoint
  router.get("/server-info", (req: Request, res: Response): void => {
    const protocol = req.protocol;
    const hostname = req.hostname;
    res.json({
      baseUrl: `${protocol}://${hostname}:${serverPort}`,
    });
  });

  // System metrics endpoint
  router.get(
    "/metrics",
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const cpuUsage = os.loadavg()[0]; // 1 minute load average
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memoryUsage = (usedMem / totalMem) * 100;

        // Get GPU metrics
        const gpuInfo = await ollamaService.getGpuInfo();

        // Get model metrics
        const modelMetrics = modelService.getMetrics();

        res.json({
          cpu: {
            loadAverage: cpuUsage.toFixed(2),
            cores: os.cpus().length,
          },
          memory: {
            total: Math.round(totalMem / (1024 * 1024 * 1024)), // Convert to GB
            used: Math.round(usedMem / (1024 * 1024 * 1024)), // Convert to GB
            usagePercentage: memoryUsage.toFixed(2),
          },
          ...(gpuInfo && { gpu: gpuInfo }), // Include GPU info if available
          model: {
            requests: {
              total: modelMetrics.totalRequests,
              successful: modelMetrics.successfulRequests,
              failed: modelMetrics.failedRequests,
              lastRequestTime: modelMetrics.lastRequestTime,
            },
            tokens: {
              input: modelMetrics.tokens.input,
              output: modelMetrics.tokens.output,
              total: modelMetrics.tokens.total,
            },
            performance: {
              inputTokensPerSecond:
                modelMetrics.performance.inputTokensPerSecond.toFixed(1),
              outputTokensPerSecond:
                modelMetrics.performance.outputTokensPerSecond.toFixed(1),
              totalTokensPerSecond:
                modelMetrics.performance.totalTokensPerSecond.toFixed(1),
              requestsPerMinute:
                modelMetrics.performance.requestsPerMinute.toFixed(1),
              averageTokensPerRequest:
                modelMetrics.performance.averageTokensPerRequest.toFixed(1),
              averageResponseTime: (
                modelMetrics.time.averageResponseTime / 1000
              ).toFixed(2), // Convert to seconds
            },
            uptime: Math.round(
              (Date.now() - modelMetrics.startTime) / 1000 / 60
            ), // Convert to minutes
          },
        });
      } catch (err) {
        console.error("Error fetching metrics:", err);
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        res.status(500).json({ error: errorMessage });
      }
    }
  );

  return router;
}
