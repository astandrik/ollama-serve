import { spawn } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let ollamaProcess: ReturnType<typeof spawn> | null = null;

interface GpuInfo {
  name: string;
  memoryTotal: number;
  memoryUsed: number;
  utilization: number;
}

export class OllamaService {
  private port: number;

  constructor(port: number) {
    this.port = port;
  }

  async getGpuInfo(): Promise<GpuInfo | null> {
    try {
      // First check if Ollama is running
      if (!(await this.checkRunning())) {
        return null;
      }

      const response = await fetch(`http://localhost:${this.port}/api/show`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();

      // Extract GPU info from Ollama's response
      if (data.gpu) {
        return {
          name: data.gpu.name || "Unknown GPU",
          memoryTotal: data.gpu.memory_total || 0,
          memoryUsed: data.gpu.memory_used || 0,
          utilization: data.gpu.utilization || 0,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching GPU info:", error);
      return null;
    }
  }

  // Check if Ollama is installed
  async checkInstalled(): Promise<boolean> {
    try {
      await execAsync("ollama --version");
      return true;
    } catch (error) {
      return false;
    }
  }

  // Check if Ollama is already running
  async checkRunning(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.port}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Wait for Ollama to be ready
  private async waitForReady(timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await this.checkRunning()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
  }

  // Start Ollama server
  async start(): Promise<void> {
    try {
      if (await this.checkRunning()) {
        console.log("Ollama is already running");
        return;
      }

      const isInstalled = await this.checkInstalled();
      if (!isInstalled) {
        throw new Error(
          "Ollama is not installed. Please install it first: https://ollama.ai"
        );
      }

      ollamaProcess = spawn("ollama", ["serve"], {
        env: {
          ...process.env,
          OLLAMA_HOST: "0.0.0.0",
          OLLAMA_PORT: this.port.toString(),
        },
      });

      ollamaProcess.stdout?.on("data", (data) => {
        console.log(`Ollama stdout: ${data}`);
      });

      ollamaProcess.stderr?.on("data", (data) => {
        console.error(`Ollama stderr: ${data}`);
      });

      ollamaProcess.on("close", (code) => {
        console.log(`Ollama process exited with code ${code}`);
        ollamaProcess = null;
      });

      const isReady = await this.waitForReady();
      if (!isReady) {
        throw new Error("Ollama failed to start within timeout");
      }

      console.log("Ollama started successfully");
    } catch (error) {
      console.error("Failed to start Ollama:", error);
      throw error;
    }
  }
}
