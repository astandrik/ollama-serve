import { useState, useEffect } from "react";
import { ProgressType, StreamResponse } from "../types";

export const useModel = () => {
  const [model, setModel] = useState<string>("");
  const [responses, setResponses] = useState<Record<string, string>>({});

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch("/api/models");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAvailableModels(
        data.models?.map((m: { name: string }) => m.name) || []
      );
    } catch (err) {
      console.error("Error fetching models:", err);
    }
  };

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ProgressType | null>(
    null
  );
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const handleMultipartResponse = async (
    response: Response,
    title?: string
  ) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    const boundary = "PROGRESS_BOUNDARY";

    // Reset response for this title if it exists
    if (title) {
      setResponses((prev) => ({ ...prev, [title]: "" }));
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete parts
      while (true) {
        const boundaryIndex = buffer.indexOf(`--${boundary}\r\n`);
        if (boundaryIndex === -1) break;

        // Find the end of this part
        const endIndex = buffer.indexOf(
          `--${boundary}`,
          boundaryIndex + boundary.length + 4
        );
        if (endIndex === -1) break;

        // Extract the part content
        const part = buffer.substring(boundaryIndex, endIndex);
        buffer = buffer.substring(endIndex);

        // Skip if this is the end boundary
        if (part.includes(`--${boundary}--`)) continue;

        try {
          // Extract JSON content between double newlines
          const match = part.match(/\r\n\r\n(.*?)\r\n/s);
          if (match) {
            const data: StreamResponse = JSON.parse(match[1]);

            if (data.error) {
              console.error("Stream error:", data.error);
              setError(data.error);
              setDownloadProgress(null);
              return;
            }

            if (data.progress) {
              setDownloadProgress(data.progress);
            }

            if (data.status === "ready") {
              setDownloadProgress(null);
              setTimeout(() => setError(""), 2000);
            }

            if (data.response && title) {
              setResponses((prev) => ({
                ...prev,
                [title]: (prev[title] || "") + data.response,
              }));
            }

            if (data.done) {
              return;
            }
          }
        } catch (e) {
          console.error("Error parsing multipart data:", e);
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
      setResponses({});
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
      setLoadingTitle(null);
    }
  };

  const generateExample = async (
    title: string,
    prompt: string,
    code: string
  ) => {
    if (!model.trim()) {
      setError("Please enter a model name");
      return;
    }

    try {
      setIsLoading(true);
      setLoadingTitle(title);
      setError("");
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

      await handleMultipartResponse(response, title);
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
    responses,
    error,
    isLoading,
    loadingTitle,
    downloadProgress,
    availableModels,
    pullModel,
    generateExample,
  };
};
