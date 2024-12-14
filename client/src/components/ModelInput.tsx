import React from "react";

interface ModelInputProps {
  model: string;
  isLoading: boolean;
  onModelChange: (model: string) => void;
  onPullModel: () => void;
}

export const ModelInput: React.FC<ModelInputProps> = ({
  model,
  isLoading,
  onModelChange,
  onPullModel,
}) => {
  return (
    <div className="model-section">
      <div className="model-input">
        <input
          type="text"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          placeholder="Enter any model name (e.g., codellama, llama2, mistral, or your custom model)"
          disabled={isLoading}
        />
        <button onClick={onPullModel} disabled={isLoading || !model.trim()}>
          Pull Model
        </button>
      </div>
    </div>
  );
};
