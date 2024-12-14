import React from "react";

interface ProgressBarProps {
  percent: number;
  status: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  status,
}) => (
  <div className="progress-container">
    <div className="progress-status">{status}</div>
    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
    <div className="progress-percent">{percent}%</div>
  </div>
);
