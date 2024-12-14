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
}
