import React from "react";
import { DynamicAction } from "../../../packages/api-schema/src/index";

interface DynamicActionBarProps {
  actions: DynamicAction[];
  onAction: (event: string) => void;
}

const DynamicActionBar: React.FC<DynamicActionBarProps> = ({
  actions,
  onAction,
}) => {
  if (actions.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        padding: "12px",
        borderTop: "1px solid #333",
        backgroundColor: "#000",
        fontFamily: "monospace",
      }}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.event)}
          style={{
            padding: "4px 12px",
            backgroundColor: action.primary ? "#00ff00" : "transparent",
            color: action.primary ? "#000" : "#00ff00",
            border: "1px solid #00ff00",
            cursor: "pointer",
            fontSize: "12px",
            textTransform: "uppercase",
            fontWeight: action.primary ? "bold" : "normal",
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default DynamicActionBar;
