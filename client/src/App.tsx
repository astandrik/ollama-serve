import React from "react";
import { ProgressBar } from "./components/ProgressBar";
import { CodeExample } from "./components/CodeExample";
import { ModelInput } from "./components/ModelInput";
import { APIUsage } from "./components/APIUsage";
import { useModel } from "./hooks/useModel";
import { useServerInfo } from "./hooks/useServerInfo";
import { codeExamples } from "./data/codeExamples";

const App: React.FC = () => {
  const {
    model,
    setModel,
    responses,
    error: modelError,
    isLoading,
    loadingTitle,
    downloadProgress,
    availableModels,
    pullModel,
    generateExample,
  } = useModel();

  const { baseUrl, loading: serverInfoLoading } = useServerInfo();

  return (
    <div className="code-api">
      <h1>Ollama Code Assistant API</h1>

      <div className="server-info">
        {!serverInfoLoading && (
          <>
            <p>
              Server running at: <code>{baseUrl}</code>
            </p>
            <p>Available endpoints:</p>
            <p>
              • Generate: <code>POST {baseUrl}/api/generate</code>
            </p>
            <p>
              • Pull model: <code>POST {baseUrl}/api/pull</code>
            </p>
            <p>
              • List models: <code>GET {baseUrl}/api/models</code>
            </p>
            <p>
              • Health check: <code>GET {baseUrl}/api/health</code>
            </p>
          </>
        )}
      </div>

      <ModelInput
        model={model}
        isLoading={isLoading}
        availableModels={availableModels}
        onModelChange={setModel}
        onPullModel={pullModel}
      />

      {modelError && <div className="error">{modelError}</div>}
      {downloadProgress && (
        <ProgressBar
          percent={downloadProgress.percent}
          status={downloadProgress.status}
        />
      )}

      <div className="examples">
        <h2>Code Examples</h2>
        <div className="examples-grid">
          {codeExamples.map((example, index) => (
            <CodeExample
              key={index}
              {...example}
              isLoading={isLoading && loadingTitle === example.title}
              model={model}
              responses={responses}
              onTry={(title) =>
                generateExample(title, example.prompt, example.code)
              }
            />
          ))}
        </div>
      </div>

      <APIUsage model={model} />
    </div>
  );
};

export default App;
