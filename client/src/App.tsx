import React from "react";
import { ProgressBar } from "./components/ProgressBar";
import { CodeExample } from "./components/CodeExample";
import { ModelInput } from "./components/ModelInput";
import { APIUsage } from "./components/APIUsage";
import { useModel } from "./hooks/useModel";
import { codeExamples } from "./data/codeExamples";

const App: React.FC = () => {
  const {
    model,
    setModel,
    response,
    error,
    isLoading,
    downloadProgress,
    pullModel,
    generateExample,
  } = useModel();

  return (
    <div className="code-api">
      <h1>Ollama Code Assistant</h1>

      <ModelInput
        model={model}
        isLoading={isLoading}
        onModelChange={setModel}
        onPullModel={pullModel}
      />

      {error && <div className="error">{error}</div>}
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
              isLoading={isLoading}
              model={model}
              response={response}
              onTry={() => generateExample(example.prompt, example.code)}
            />
          ))}
        </div>
      </div>

      <APIUsage model={model} />
    </div>
  );
};

export default App;
