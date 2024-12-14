import { useState } from "react";
import { ProgressType, StreamResponse } from "../types";

export const useModel = () => {
  const [model, setModel] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<ProgressType | null>(
    null
  );

  const handleMultipartResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let boundary = "";

    // Extract boundary from Content-Type header
    const contentType = response.headers.get("Content-Type") || "";
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (boundaryMatch) {
      boundary = boundaryMatch[1];
    }

    if (!boundary) {
      throw new Error("No boundary found in multipart response");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split buffer by boundary
      const parts = buffer.split(`--${boundary}`);

      // Keep the last part in buffer as it might be incomplete
      buffer = parts.pop() || "";

      // Process complete parts
      for (const part of parts) {
        if (part.trim() && !part.includes("--\r\n")) {
          // Skip empty parts and end boundary
          try {
            // Extract JSON content from part
            const match = part.match(/\r\n\r\n(.*?)\r\n/s);
            if (match) {
              const data: StreamResponse = JSON.parse(match[1]);
              console.log("Received part:", data);

              if (data.error) {
                console.error("Stream error:", data.error);
                setError(data.error);
                setDownloadProgress(null);
                return;
              }

              if (data.progress) {
                console.log("Setting progress:", data.progress);
                setDownloadProgress(data.progress);
              }

              if (data.status === "ready") {
                console.log("Model ready:", data.message);
                setDownloadProgress(null);
                setTimeout(() => setError(""), 2000);
              }

              if (data.response) {
                console.log("Received response chunk");
                setResponse((prev) => prev + data.response);
              }
            }
          } catch (e) {
            console.error("Error parsing multipart data:", e);
          }
        }
      }
    }
  };

  const pullModel = async () => {
    if (!model.trim()) {
      setError("Please enter a model name");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setResponse("");
      setDownloadProgress(null);

      console.log("Starting model pull request...");
      const response = await fetch("/api/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Pull request failed:", response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }

      console.log("Connected, processing multipart response...");
      setDownloadProgress({
        status: "Connecting to server...",
        percent: 0,
      });

      await handleMultipartResponse(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      console.error("Pull error:", errorMessage);
      setError(errorMessage);
      setDownloadProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const generateExample = async (prompt: string, code: string) => {
    if (!model.trim()) {
      setError("Please enter a model name");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setResponse("");
      setDownloadProgress(null);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: `${prompt}\n\nCode:\n${code}`,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }

      await handleMultipartResponse(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      console.error("Generate error:", errorMessage);
      setError(errorMessage);
      setDownloadProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    model,
    setModel,
    response,
    error,
    isLoading,
    downloadProgress,
    pullModel,
    generateExample,
  };
};
