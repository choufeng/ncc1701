import React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

const Layout: React.FC = () => {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        fontFamily: "monospace",
      }}
    >
      <Group orientation="horizontal">
        <Panel defaultSize={20} minSize={10}>
          <div
            style={{
              height: "100%",
              padding: "10px",
              borderRight: "1px solid #333",
            }}
          >
            <div>Pipeline</div>
          </div>
        </Panel>

        <Separator
          style={{
            width: "2px",
            backgroundColor: "#333",
            cursor: "col-resize",
          }}
        />

        <Panel defaultSize={50} minSize={20}>
          <div style={{ height: "100%", padding: "10px" }}>
            <div>Chat</div>
          </div>
        </Panel>

        <Separator
          style={{
            width: "2px",
            backgroundColor: "#333",
            cursor: "col-resize",
          }}
        />

        <Panel defaultSize={30} minSize={10}>
          <div
            style={{
              height: "100%",
              padding: "10px",
              borderLeft: "1px solid #333",
            }}
          >
            <div>Artifacts</div>
          </div>
        </Panel>
      </Group>
    </div>
  );
};

export default Layout;
