import { Response } from "express";

export class ModelService {
  private port: number;

  constructor(port: number) {
    this.port = port;
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
    const response = await fetch(`http://localhost:${this.port}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response;
  }
}
