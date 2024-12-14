import React from "react";

interface CodeExampleProps {
  title: string;
  description: string;
  language: string;
  code: string;
  prompt: string;
  isLoading: boolean;
  model: string;
  response?: string;
  onTry: () => void;
}

export const CodeExample: React.FC<CodeExampleProps> = ({
  title,
  description,
  language,
  code,
  isLoading,
  model,
  response,
  onTry,
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="example-card">
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="code-block">
        <div className="code-header">
          <span>{language}</span>
          <button onClick={() => copyToClipboard(code)}>Copy</button>
        </div>
        <pre>{code}</pre>
      </div>
      <button onClick={onTry} disabled={isLoading || !model.trim()}>
        Try with {model || "selected model"}
      </button>
      {response && (
        <div className="response">
          <h4>Response:</h4>
          <pre>{response}</pre>
        </div>
      )}
    </div>
  );
};
