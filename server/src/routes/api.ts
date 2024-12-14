import { Router, Request, Response } from "express";
import { OllamaService } from "../services/ollama";
import { ModelService } from "../services/model";

interface GenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

export function createApiRouter(ollamaPort: number) {
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

  return router;
}
