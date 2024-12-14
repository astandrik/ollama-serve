import express from "express";
import cors from "cors";
import { createApiRouter } from "./routes/api";
import { OllamaService } from "./services/ollama";

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_PORT = process.env.OLLAMA_PORT || 11434;

app.use(cors());
app.use(express.json());

// Create and mount API routes
app.use("/api", createApiRouter(Number(OLLAMA_PORT)));

const startServer = async () => {
  try {
    // Initialize Ollama service and start Ollama
    const ollamaService = new OllamaService(Number(OLLAMA_PORT));
    await ollamaService.start();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Ollama running on port ${OLLAMA_PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
