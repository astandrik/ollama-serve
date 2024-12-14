import { useState, useEffect } from "react";

export const useServerInfo = () => {
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServerInfo = async () => {
      try {
        const response = await fetch("/api/server-info");
        if (!response.ok) {
          throw new Error("Failed to fetch server info");
        }
        const data = await response.json();
        setBaseUrl(data.baseUrl);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        // Fallback to window.location if server info fetch fails
        const fallbackUrl = `${window.location.protocol}//${window.location.host}`;
        setBaseUrl(fallbackUrl);
      } finally {
        setLoading(false);
      }
    };

    fetchServerInfo();
  }, []);

  return { baseUrl, loading, error };
};
