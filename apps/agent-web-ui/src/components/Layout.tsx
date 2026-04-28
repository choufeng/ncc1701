import React, { useState, useEffect } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import DynamicActionBar from "./DynamicActionBar";
import {
  DynamicAction,
  ServerToClientMessage,
} from "../../../packages/api-schema/src/index";

const Layout: React.FC = () => {
  const [actions, setActions] = useState<DynamicAction[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3000/agent/run");
    socket.onmessage = (event) => {
      const message: ServerToClientMessage = JSON.parse(event.data);
      if (message.type === "DYNAMIC_ACTION") {
        setActions(message.payload as DynamicAction[]);
      }
    };
    setWs(socket);
    return () => socket.close();
  }, []);

  const handleAction = (event: string) => {
    ws?.send(JSON.stringify({ event }));
  };

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
          <div
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            <div style={{ flex: 1, padding: "10px" }}>
              <div>Chat</div>
            </div>
            <DynamicActionBar actions={actions} onAction={handleAction} />
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
