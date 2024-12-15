import React from "react";
import { SystemMetrics } from "../components/SystemMetrics";

export const MetricsPage: React.FC = () => {
  return (
    <div>
      <h1>System Performance</h1>
      <p className="metrics-description">
        Real-time monitoring of system resources and model performance metrics.
      </p>
      <div className="metrics-dashboard">
        <SystemMetrics />
        <div className="metrics-info">
          <h3>About These Metrics</h3>
          <ul>
            <li>CPU load and core utilization</li>
            <li>Memory usage and allocation</li>
            <li>GPU metrics (when available)</li>
            <li>Model performance statistics</li>
            <li>Request and token processing rates</li>
          </ul>
          <p className="metrics-note">
            All metrics are updated in real-time every 2 seconds.
          </p>
        </div>
      </div>
    </div>
  );
};
