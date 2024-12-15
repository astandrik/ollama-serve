import { Response } from "express";

interface TokenMetrics {
  input: number;
  output: number;
  total: number;
}

interface TimeMetrics {
  averageResponseTime: number;
  totalProcessingTime: number;
}

interface PerformanceMetrics {
  inputTokensPerSecond: number;
  outputTokensPerSecond: number;
  totalTokensPerSecond: number;
  requestsPerMinute: number;
  averageTokensPerRequest: number;
}

interface ModelMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  tokens: TokenMetrics;
  time: TimeMetrics;
  performance: PerformanceMetrics;
  startTime: number;
  lastRequestTime: number | null;
  requestHistory: Array<{
    timestamp: number;
    duration: number;
    inputTokens: number;
    outputTokens: number;
    success: boolean;
  }>;
}

export class ModelService {
  private port: number;
  private metrics: ModelMetrics;

  constructor(port: number) {
    this.port = port;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      tokens: {
        input: 0,
        output: 0,
        total: 0,
      },
      time: {
        averageResponseTime: 0,
        totalProcessingTime: 0,
      },
      performance: {
        inputTokensPerSecond: 0,
        outputTokensPerSecond: 0,
        totalTokensPerSecond: 0,
        requestsPerMinute: 0,
        averageTokensPerRequest: 0,
      },
      startTime: Date.now(),
      lastRequestTime: null,
      requestHistory: [],
    };
  }

  getMetrics(): ModelMetrics {
    // Calculate real-time performance metrics
    const now = Date.now();
    const minutesRunning = (now - this.metrics.startTime) / (1000 * 60);

    // Update requests per minute
    this.metrics.performance.requestsPerMinute =
      this.metrics.totalRequests / minutesRunning;

    // Update average tokens per request
    this.metrics.performance.averageTokensPerRequest =
      this.metrics.totalRequests > 0
        ? this.metrics.tokens.total / this.metrics.totalRequests
        : 0;

    // Calculate speeds based on the last 3 seconds of activity
    const recentWindow = 3000; // 3 seconds
    const recentRequests = this.metrics.requestHistory.filter(
      (req) => now - req.timestamp <= recentWindow
    );

    if (recentRequests.length > 0) {
      // Find the earliest timestamp in our window
      const windowStart = Math.min(
        ...recentRequests.map((req) => req.timestamp)
      );
      const windowDuration = (now - windowStart) / 1000; // convert to seconds

      // Get the most recent request for instantaneous speeds
      const latestRequest = recentRequests[recentRequests.length - 1];
      const latestDuration = latestRequest.duration / 1000; // convert to seconds

      if (latestDuration > 0) {
        // Calculate instantaneous speeds from the latest request
        this.metrics.performance.inputTokensPerSecond =
          latestRequest.inputTokens / latestDuration;
        this.metrics.performance.outputTokensPerSecond =
          latestRequest.outputTokens / latestDuration;
        this.metrics.performance.totalTokensPerSecond =
          (latestRequest.inputTokens + latestRequest.outputTokens) /
          latestDuration;
      } else {
        // If no recent activity, calculate average over the window
        const totalInputTokens = recentRequests.reduce(
          (sum, req) => sum + req.inputTokens,
          0
        );
        const totalOutputTokens = recentRequests.reduce(
          (sum, req) => sum + req.outputTokens,
          0
        );

        this.metrics.performance.inputTokensPerSecond =
          windowDuration > 0 ? totalInputTokens / windowDuration : 0;
        this.metrics.performance.outputTokensPerSecond =
          windowDuration > 0 ? totalOutputTokens / windowDuration : 0;
        this.metrics.performance.totalTokensPerSecond =
          windowDuration > 0
            ? (totalInputTokens + totalOutputTokens) / windowDuration
            : 0;
      }
    } else {
      // Reset speeds if no recent activity
      this.metrics.performance.inputTokensPerSecond = 0;
      this.metrics.performance.outputTokensPerSecond = 0;
      this.metrics.performance.totalTokensPerSecond = 0;
    }

    return { ...this.metrics };
  }

  // Check if model exists
  async checkExists(model: string): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.port}/api/tags`);
      const data = await response.json();
      return data.models?.some((m: any) => m.name === model) || false;
    } catch (error) {
      return false;
    }
  }

  // Pull model with progress streaming
  async pull(model: string, res: Response): Promise<void> {
    console.log(`Pulling model: ${model}`);

    const boundary = "PROGRESS_BOUNDARY";
    res.setHeader(
      "Content-Type",
      `multipart/x-mixed-replace; boundary=${boundary}`
    );

    // Helper function to send progress update
    const sendProgress = (data: any) => {
      const content = JSON.stringify(data);
      const part = `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n`;
      console.log("Sending progress:", content);
      res.write(part);
    };

    // Send initial status
    sendProgress({
      status: "downloading",
      progress: {
        status: `Initializing download for ${model}...`,
        percent: 0,
      },
    });

    try {
      console.log(
        `Fetching from Ollama: http://localhost:${this.port}/api/pull`
      );
      const response = await fetch(`http://localhost:${this.port}/api/pull`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: model }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${await response.text()}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let totalSize = 0;
      let currentPart = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim()) {
            try {
              const progress = JSON.parse(line);
              // Update total size if available
              if (progress.total && !totalSize) {
                totalSize = progress.total;
              }

              // Log raw progress for debugging
              console.log("Raw Ollama progress:", JSON.stringify(progress));

              // Determine status message and percent
              let statusMessage = "Processing...";
              let percentComplete = 0;

              if (progress.status === "downloading" && progress.total) {
                statusMessage = `Downloading ${model} (${Math.round(
                  progress.completed / 1024 / 1024
                )}MB/${Math.round(progress.total / 1024 / 1024)}MB)`;
                percentComplete = Math.round(
                  (progress.completed / progress.total) * 100
                );
              } else if (progress.status === "verifying") {
                statusMessage = "Verifying download...";
                percentComplete = 95;
              } else if (progress.status === "extracting") {
                statusMessage = "Extracting model...";
                percentComplete = 98;
              } else if (progress.digest) {
                statusMessage = `Processing part ${++currentPart}`;
                percentComplete =
                  progress.completed && totalSize
                    ? Math.round((progress.completed / totalSize) * 100)
                    : 0;
              }

              // Send progress update
              sendProgress({
                status: progress.status,
                progress: {
                  status: statusMessage,
                  percent: percentComplete,
                },
              });
            } catch (e) {
              console.error("Error parsing progress:", e);
            }
          }
        }
      }

      // Send completion message
      sendProgress({
        status: "ready",
        message: `Model ${model} is ready`,
      });

      // End multipart response
      res.write(`\r\n--${boundary}--\r\n`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Failed to download model: ${errorMessage}`);
    }
  }

  // Generate response
  async generate(model: string, prompt: string): Promise<globalThis.Response> {
    const requestStartTime = Date.now();
    this.metrics.totalRequests++;
    this.metrics.lastRequestTime = requestStartTime;

    // Estimate input tokens (rough approximation: words * 1.3)
    const inputTokens = Math.ceil(prompt.split(/\s+/).length * 1.3);
    this.metrics.tokens.input += inputTokens;
    this.metrics.tokens.total += inputTokens;

    try {
      const response = await fetch(
        `http://localhost:${this.port}/api/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            prompt,
            stream: true,
          }),
        }
      );

      if (!response.ok) {
        this.metrics.failedRequests++;
        throw new Error(await response.text());
      }

      // Clone response to track tokens
      const clonedResponse = response.clone();
      const reader = clonedResponse.body?.getReader();
      if (reader) {
        // Process stream in background to count tokens
        this.processStreamForMetrics(reader, requestStartTime);
      }

      return response;
    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    }
  }

  private async processStreamForMetrics(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    startTime: number
  ) {
    let outputTokens = 0;
    let lastTokenCount = 0;
    let lastUpdateTime = Date.now();
    let speedUpdateInterval: NodeJS.Timeout;
    let tokenBuffer: number[] = []; // Store recent token counts
    const updateInterval = 1000; // Update every 1s

    const calculateSpeed = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateTime) / 1000; // seconds
      const deltaTokens = outputTokens - lastTokenCount;

      if (deltaTime > 0) {
        // Calculate instantaneous speed
        const instantSpeed = deltaTokens / deltaTime;

        // Add to rolling buffer
        tokenBuffer.push(instantSpeed);
        if (tokenBuffer.length > 10) {
          // Keep last 10 measurements
          tokenBuffer.shift();
        }

        // Calculate smoothed speed (moving average)
        const avgSpeed =
          tokenBuffer.reduce((a, b) => a + b, 0) / tokenBuffer.length;

        // Update metrics with smoothed values
        this.metrics.performance.outputTokensPerSecond = avgSpeed;
        this.metrics.performance.inputTokensPerSecond = avgSpeed * 0.2; // rough estimate
        this.metrics.performance.totalTokensPerSecond =
          this.metrics.performance.outputTokensPerSecond +
          this.metrics.performance.inputTokensPerSecond;
      }

      lastTokenCount = outputTokens;
      lastUpdateTime = now;
    };

    // Update speeds regularly
    speedUpdateInterval = setInterval(calculateSpeed, updateInterval);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              if (response.eval_count) {
                // Use actual token count from Ollama
                const tokens = response.eval_count;
                outputTokens += tokens;
                this.metrics.tokens.output += tokens;
                this.metrics.tokens.total += tokens;

                // Update speed immediately for each token batch
                const now = Date.now();
                const deltaTime = (now - lastUpdateTime) / 1000;
                if (deltaTime > 0) {
                  const instantSpeed = tokens / deltaTime;
                  tokenBuffer.push(instantSpeed);
                  if (tokenBuffer.length > 10) {
                    tokenBuffer.shift();
                  }

                  // Calculate smoothed speed
                  const avgSpeed =
                    tokenBuffer.reduce((a, b) => a + b, 0) / tokenBuffer.length;
                  this.metrics.performance.outputTokensPerSecond = avgSpeed;
                  this.metrics.performance.inputTokensPerSecond =
                    avgSpeed * 0.2;
                  this.metrics.performance.totalTokensPerSecond =
                    this.metrics.performance.outputTokensPerSecond +
                    this.metrics.performance.inputTokensPerSecond;
                }
                lastUpdateTime = now;
              }
            } catch (e) {
              console.error("Error parsing response:", e);
            }
          }
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      this.metrics.successfulRequests++;
      this.metrics.time.totalProcessingTime += duration;
      this.metrics.time.averageResponseTime =
        this.metrics.time.totalProcessingTime / this.metrics.successfulRequests;

      // Calculate final speeds
      const totalDuration = duration / 1000; // seconds
      const inputTokens = Math.ceil(outputTokens * 0.2); // rough estimate
      this.metrics.performance.inputTokensPerSecond =
        inputTokens / totalDuration;
      this.metrics.performance.outputTokensPerSecond =
        outputTokens / totalDuration;
      this.metrics.performance.totalTokensPerSecond =
        (inputTokens + outputTokens) / totalDuration;

      // Add to request history (keep last 100 requests)
      this.metrics.requestHistory.push({
        timestamp: endTime,
        duration,
        inputTokens,
        outputTokens,
        success: true,
      });

      if (this.metrics.requestHistory.length > 100) {
        this.metrics.requestHistory.shift();
      }
    } catch (error) {
      console.error("Error processing stream for metrics:", error);
      this.metrics.failedRequests++;
    }
  }
}
