import React from "react";

interface CodeExampleProps {
  title: string;
  description: string;
  language: string;
  code: string;
  prompt: string;
  isLoading: boolean;
  model: string;
  responses: Record<string, string>;
  onTry: (title: string) => void;
}

export const CodeExample: React.FC<CodeExampleProps> = ({
  title,
  description,
  language,
  code,
  isLoading,
  model,
  responses,
  onTry,
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleTry = (e: React.MouseEvent) => {
    e.preventDefault();
    onTry(title);
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
      <button onClick={handleTry} disabled={isLoading || !model.trim()}>
        Try with {model || "selected model"}
      </button>
      {responses[title] && (
        <div className="response">
          <h4>Response:</h4>
          <pre>{responses[title]}</pre>
        </div>
      )}
    </div>
  );
};
