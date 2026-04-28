import { Elysia, t } from "elysia";
import { CodingAgent } from "@pi-mono/core";
import { shellTool, readFileTool } from "./tools/system";

export const app = new Elysia().ws("/agent/run", {
  body: t.Object({
    prompt: t.Optional(t.String()),
    event: t.Optional(t.String()),
  }),
  async message(ws, { prompt, event }) {
    if (event) {
      console.log(`Received dynamic action event: ${event}`);
      // Handle the event...
      return;
    }

    if (prompt) {
      try {
        const agent = new CodingAgent({
          tools: [shellTool, readFileTool],
          onStep: (step) => {
            ws.send({ type: "step", data: step });
          },
        });

        // Example: sending a dynamic action after starting
        ws.send({
          type: "DYNAMIC_ACTION",
          payload: [
            { id: "1", label: "Stop", event: "AGENT_STOP", primary: false },
            { id: "2", label: "Retry", event: "AGENT_RETRY", primary: true },
          ],
        });

        const result = await agent.run(prompt);
        ws.send({ type: "result", data: result });
      } catch (error: any) {
        ws.send({ type: "error", message: error.message });
      }
    }
  },
});
