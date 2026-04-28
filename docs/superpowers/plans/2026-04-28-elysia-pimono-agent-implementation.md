# ElysiaJS & pi-mono Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-performance, minimalist AI Agent system with an ElysiaJS backend and pi-mono Web UI for long-running task execution.

**Architecture:** Monorepo structure with ElysiaJS handling WebSocket communication and tool execution on Bun, paired with a React frontend using pi-mono's minimalist component library.

**Tech Stack:** Bun, ElysiaJS, React, Vite, @pi-mono/core, @pi-mono/web-ui.

---

### Task 1: Initialize Monorepo Structure

**Files:**

- Create: `apps/agent-backend/package.json`
- Create: `apps/agent-web-ui/package.json`
- Create: `packages/api-schema/package.json`
- Modify: `package.json` (root)

- [ ] **Step 1: Create backend package.json**

```json
{
  "name": "agent-backend",
  "version": "0.1.0",
  "scripts": {
    "dev": "bun run --hot src/index.ts"
  },
  "dependencies": {
    "elysia": "latest",
    "@pi-mono/core": "latest"
  }
}
```

- [ ] **Step 2: Create frontend package.json**

```json
{
  "name": "agent-web-ui",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite"
  },
  "dependencies": {
    "react": "latest",
    "react-dom": "latest",
    "@pi-mono/web-ui": "latest"
  },
  "devDependencies": {
    "vite": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest"
  }
}
```

- [ ] **Step 3: Update root package.json to include workspaces**
      Ensure `workspaces` includes `apps/*` and `packages/*`.
- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: initialize agent monorepo structure"
```

### Task 2: Implement ElysiaJS Backend with WebSocket

**Files:**

- Create: `apps/agent-backend/src/index.ts`
- Create: `apps/agent-backend/src/tools/system.ts`

- [ ] **Step 1: Implement basic system tools**

```typescript
import { Tool } from "@pi-mono/core";

export const shellTool = new Tool({
  name: "execute_shell",
  description: "Run shell commands",
  schema: { command: { type: "string" } },
  async execute({ command }) {
    const proc = Bun.spawn(command.split(" "));
    return { output: await new Response(proc.stdout).text() };
  },
});
```

- [ ] **Step 2: Implement Elysia WebSocket server**

```typescript
import { Elysia, t } from "elysia";
import { CodingAgent } from "@pi-mono/core";
import { shellTool } from "./tools/system";

const app = new Elysia()
  .ws("/agent/run", {
    body: t.Object({ prompt: t.String() }),
    async message(ws, { prompt }) {
      const agent = new CodingAgent({
        tools: [shellTool],
        onStep: (step) => ws.send({ type: "step", ...step }),
      });
      const result = await agent.run(prompt);
      ws.send({ type: "done", result });
    },
  })
  .listen(3000);
```

- [ ] **Step 3: Commit**

```bash
git add apps/agent-backend
git commit -m "feat: implement elysia websocket and shell tool"
```

### Task 3: Implement pi-mono Web UI

**Files:**

- Create: `apps/agent-web-ui/src/App.tsx`
- Create: `apps/agent-web-ui/src/hooks/useAgent.ts`

- [ ] **Step 1: Create useAgent hook for WebSocket communication**
      Implement state management for messages and connection status.
- [ ] **Step 2: Build the UI using pi-mono components**

```tsx
import { AgentMessageStream, TaskTimeline } from "@pi-mono/web-ui";
// Use the layout discussed: Three-column minimalist design.
```

- [ ] **Step 3: Commit**

```bash
git add apps/agent-web-ui
git commit -m "feat: implement minimalist agent web ui"
```
