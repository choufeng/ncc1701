# ElysiaJS & pi-mono Agent Workstation (V2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 3-pane Generative AI workstation with resizable layouts and a component registry.

**Architecture:** Monorepo with ElysiaJS backend and React frontend. Uses a custom Artifact Protocol for streaming dynamic UI components.

**Tech Stack:** Bun, ElysiaJS, React, Vite, react-resizable-panels, @pi-mono/core.

---

### Task 1: Elastic Layout with Resizable Panels

**Files:**

- Modify: `apps/agent-web-ui/package.json`
- Create: `apps/agent-web-ui/src/components/Layout.tsx`
- Modify: `apps/agent-web-ui/src/App.tsx`

- [ ] **Step 1: Install react-resizable-panels**
      Run: `bun add react-resizable-panels` in `apps/agent-web-ui`.
- [ ] **Step 2: Create Layout component**
      Implement the 3-pane structure (Pipeline | Chat | Artifacts) with drag handles.
- [ ] **Step 3: Update App.tsx to use Layout**
      Wrap the application in the new resizable layout.
- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add 3-pane resizable layout"
```

### Task 2: Artifact Protocol & Registry

**Files:**

- Modify: `packages/api-schema/src/index.ts`
- Create: `apps/agent-web-ui/src/registry/index.ts`
- Create: `apps/agent-web-ui/src/components/ArtifactRenderer.tsx`

- [ ] **Step 1: Define Artifact types in schema**
      Add `MOUNT_ARTIFACT` and `PATCH_ARTIFACT` message types.
- [ ] **Step 2: Implement Component Registry**
      Create a map of `componentId` to React components (starting with a placeholder OptimizationChart).
- [ ] **Step 3: Create ArtifactRenderer**
      A component that switches between Registry components and a future Sandbox fallback.
- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: implement artifact protocol and component registry"
```

### Task 3: Dynamic Contextual Action Bar

**Files:**

- Create: `apps/agent-web-ui/src/components/DynamicActionBar.tsx`
- Modify: `apps/agent-backend/src/index.ts`

- [ ] **Step 1: Create UI for dynamic buttons**
      Implement a bar that renders buttons based on the current artifact's metadata.
- [ ] **Step 2: Update Backend to send Dynamic Actions**
      Modify the Elysia agent handler to push `DYNAMIC_ACTION` messages.
- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add dynamic contextual action bar"
```
