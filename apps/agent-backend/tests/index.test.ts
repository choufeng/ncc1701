import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from "../src/app";

describe("Agent Backend WS", () => {
  let server: any;

  beforeAll(() => {
    server = app.listen(3001); // Use a different port for testing
  });

  afterAll(() => {
    server.stop();
  });

  test("should stream agent steps via WebSocket", (done) => {
    const ws = new WebSocket("ws://localhost:3001/agent/run");

    let stepReceived = false;

    ws.onopen = () => {
      ws.send(JSON.stringify({ prompt: "Hello agent" }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string);
      if (msg.type === "step") {
        stepReceived = true;
      }
      if (msg.type === "result") {
        try {
          expect(stepReceived).toBe(true);
          expect(msg.data).toContain("Completed task");
          ws.close();
          done();
        } catch (e) {
          done(e);
        }
      }
    };

    ws.onerror = (error) => {
      done(error);
    };
  });
});
