import React from "react";

interface APIUsageProps {
  model: string;
}

export const APIUsage: React.FC<APIUsageProps> = ({ model }) => {
  return (
    <div className="api-endpoint">
      <h2>API Usage</h2>
      <pre className="code-block">
        {`// Example API call
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: '${model || "your-model-name"}',
    prompt: 'Your code-related prompt',
    stream: true
  })
});

// Handle streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log(data.response);
    }
  }
}`}
      </pre>
    </div>
  );
};
