export interface CodeExampleType {
  title: string;
  description: string;
  prompt: string;
  language: string;
  code: string;
}

export interface ProgressType {
  status: string;
  percent: number;
}

export interface StreamResponse {
  error?: string;
  status?: string;
  progress?: {
    status: string;
    percent: number;
  };
  response?: string;
  message?: string;
  done?: boolean;
}

export interface SystemMetrics {
  cpu: {
    loadAverage: string;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    usagePercentage: string;
  };
  gpu?: {
    name: string;
    memoryTotal: number;
    memoryUsed: number;
    utilization: number;
  };
  model: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      lastRequestTime: number | null;
    };
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    performance: {
      inputTokensPerSecond: string;
      outputTokensPerSecond: string;
      totalTokensPerSecond: string;
      requestsPerMinute: string;
      averageTokensPerRequest: string;
      averageResponseTime: string;
    };
    uptime: number;
  };
}
