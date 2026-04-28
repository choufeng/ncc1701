import React from "react";
import { COMPONENT_REGISTRY } from "../registry";

interface ArtifactMetadata {
  id: string;
  componentId: string;
  props: any;
}

interface ArtifactRendererProps {
  artifact?: ArtifactMetadata;
}

const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({ artifact }) => {
  if (!artifact) {
    return (
      <div
        style={{
          padding: "20px",
          color: "#444",
          fontStyle: "italic",
          fontSize: "14px",
        }}
      >
        No artifact mounted.
      </div>
    );
  }

  const Component = COMPONENT_REGISTRY[artifact.componentId];

  if (!Component) {
    return (
      <div
        style={{
          padding: "20px",
          border: "1px solid #c00",
          color: "#f55",
          fontSize: "14px",
        }}
      >
        Error: Unknown component ID "{artifact.componentId}"
      </div>
    );
  }

  return (
    <div className="artifact-container" style={{ padding: "20px" }}>
      <Component {...artifact.props} />
    </div>
  );
};

export default ArtifactRenderer;
