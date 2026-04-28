import { Elysia, t } from "elysia";
import { CodingAgent } from "@pi-mono/core";
import { shellTool, readFileTool } from "./tools/system";

export const app = new Elysia().ws("/agent/run", {
  body: t.Object({
    prompt: t.String(),
  }),
  async message(ws, { prompt }) {
    try {
      const agent = new CodingAgent({
        tools: [shellTool, readFileTool],
        onStep: (step) => {
          ws.send({ type: "step", data: step });
        },
      });

      const result = await agent.run(prompt);
      ws.send({ type: "result", data: result });
    } catch (error: any) {
      ws.send({ type: "error", message: error.message });
    }
  },
});
