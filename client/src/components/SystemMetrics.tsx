import React from "react";
import { useServerInfo } from "../hooks/useServerInfo";
import { SystemMetrics as SystemMetricsType } from "../types";

const useMetrics = (interval = 1000) => {
  // Poll every 1s for more real-time updates
  const [metrics, setMetrics] = React.useState<SystemMetricsType | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { baseUrl } = useServerInfo();
  const retryTimeoutRef = React.useRef<NodeJS.Timeout>();
  const lastSpeedRef = React.useRef<number>(0);

  React.useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchMetrics = async () => {
      if (!mounted) return;

      try {
        const response = await fetch("/api/metrics");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to fetch metrics: ${response.status}`
          );
        }
        const data = await response.json();
        if (mounted) {
          setMetrics(data);
          setError(null);
          retryCount = 0; // Reset retry count on success
        }
      } catch (err) {
        console.error("Metrics fetch error:", err);
        if (mounted) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to fetch metrics";
          setError(errorMessage);

          // Retry logic with exponential backoff
          if (retryCount < maxRetries) {
            retryCount++;
            const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            retryTimeoutRef.current = setTimeout(fetchMetrics, retryDelay);
          }
        }
      }
    };

    fetchMetrics();
    const timer = setInterval(fetchMetrics, interval);

    return () => {
      mounted = false;
      clearInterval(timer);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [baseUrl, interval]);

  return { metrics, error };
};

export const SystemMetrics: React.FC = () => {
  const { metrics, error } = useMetrics();

  if (error) {
    return <div className="error-message">Error loading metrics: {error}</div>;
  }

  if (!metrics) {
    return <div>Loading system metrics...</div>;
  }

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="system-metrics">
      <h3>System Performance</h3>
      <div className="metrics-grid">
        <div className="metric-item">
          <div className="metric-label">CPU Load</div>
          <div className="metric-value">
            {metrics.cpu.loadAverage}
            <span className="metric-unit"> ({metrics.cpu.cores} cores)</span>
          </div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Memory Usage</div>
          <div className="metric-value">
            {metrics.memory.used}GB / {metrics.memory.total}GB
            <span className="metric-unit">
              {" "}
              ({metrics.memory.usagePercentage}%)
            </span>
          </div>
        </div>
        {metrics.gpu && (
          <div className="metric-item">
            <div className="metric-label">GPU</div>
            <div className="metric-value">
              {metrics.gpu.name}
              <div className="metric-subvalue">
                Memory: {Math.round(metrics.gpu.memoryUsed / 1024)}GB /{" "}
                {Math.round(metrics.gpu.memoryTotal / 1024)}GB
                <br />
                Utilization: {metrics.gpu.utilization}%
              </div>
            </div>
          </div>
        )}
        <div className="metric-item model-metrics">
          <div className="metric-label">Model Performance</div>
          <div className="performance-stats">
            <div className="performance-row">
              <div className="stat-group">
                <div className="stat-label">Token Processing Speed</div>
                <div className="token-speeds">
                  <div className="speed-metric">
                    <div className="speed-value primary">
                      {metrics.model.performance.inputTokensPerSecond}
                      <span className="speed-unit"> in/s</span>
                    </div>
                  </div>
                  <div className="speed-metric">
                    <div className="speed-value primary">
                      {metrics.model.performance.outputTokensPerSecond}
                      <span className="speed-unit"> out/s</span>
                    </div>
                  </div>
                  <div className="speed-metric total">
                    <div className="speed-value primary">
                      {metrics.model.performance.totalTokensPerSecond}
                      <span className="speed-unit"> total/s</span>
                    </div>
                  </div>
                </div>
                <div className="stat-subvalue">
                  {metrics.model.performance.requestsPerMinute} requests/min
                </div>
              </div>
              <div className="stat-group">
                <div className="stat-label">Response Time</div>
                <div className="stat-value">
                  {metrics.model.performance.averageResponseTime}s avg
                </div>
                <div className="stat-subvalue">
                  Last request:{" "}
                  {formatTime(metrics.model.requests.lastRequestTime)}
                </div>
              </div>
            </div>

            <div className="performance-row">
              <div className="stat-group">
                <div className="stat-label">Requests</div>
                <div className="stat-value">
                  {metrics.model.requests.total} total
                </div>
                <div className="stat-subvalue success-rate">
                  {metrics.model.requests.successful} successful
                  {metrics.model.requests.failed > 0 && (
                    <span className="error-count">
                      {metrics.model.requests.failed} failed
                    </span>
                  )}
                </div>
              </div>
              <div className="stat-group">
                <div className="stat-label">Tokens Processed</div>
                <div className="stat-value">
                  {metrics.model.tokens.total.toLocaleString()} total
                </div>
                <div className="stat-subvalue">
                  {metrics.model.performance.averageTokensPerRequest} avg/req
                </div>
              </div>
            </div>

            <div className="token-distribution">
              <div className="stat-label">Token Distribution</div>
              <div className="token-bars">
                <div className="token-bar">
                  <div className="bar-label">Input</div>
                  <div className="bar-container">
                    <div
                      className="bar-fill input"
                      style={{
                        width: `${
                          (metrics.model.tokens.input /
                            metrics.model.tokens.total) *
                            100 || 0
                        }%`,
                      }}
                    />
                  </div>
                  <div className="bar-value">
                    {metrics.model.tokens.input.toLocaleString()}
                  </div>
                </div>
                <div className="token-bar">
                  <div className="bar-label">Output</div>
                  <div className="bar-container">
                    <div
                      className="bar-fill output"
                      style={{
                        width: `${
                          (metrics.model.tokens.output /
                            metrics.model.tokens.total) *
                            100 || 0
                        }%`,
                      }}
                    />
                  </div>
                  <div className="bar-value">
                    {metrics.model.tokens.output.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
