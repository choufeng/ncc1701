# Design Spec v2: Generative AI Agent Workstation (ElysiaJS & pi-mono)

**Date:** 2026-04-28
**Status:** Finalized
**Topic:** Evolution of the AI Agent UI into a Generative Workstation with Resizable Layouts and Artifact Registry.

## 1. Vision

Transform the AI Agent from a chat interface into a **Generative Workstation**. The UI acts as a dynamic container that adapts its layout and tools based on the Agent's real-time output, providing a seamless "Human-in-the-loop" experience.

## 2. Updated Architecture

### 2.1 The Artifact Protocol (Shared)

A specialized communication layer over WebSockets to manage complex UI state.

- **Message Types:**
  - `MOUNT_ARTIFACT`: Instructs the UI to open a new resource.
  - `PATCH_ARTIFACT`: Updates data within an existing resource.
  - `DYNAMIC_ACTION`: Updates the available buttons in the bottom action bar.

### 2.2 The Intelligent Registry (Frontend)

A component mapping system in `apps/agent-web-ui`:

- **Registry:** Maps `componentId` (e.g., `CHART_V1`) to pre-defined React components.
- **Extensibility:** Pre-configured to support `type: "sandbox"` for future Live-code (Sandpack/iframe) rendering.

### 2.3 The Elastic Stage (Layout)

A three-pane resizable layout:

- **Pane 1 (Left):** Execution Pipeline (Task tracking).
- **Pane 2 (Center):** Conversation & Input (Decision making).
- **Pane 3 (Right):** Artifact Canvas (Generative UI & Resource presentation).
- **Interaction:** Dual drag-to-resize handles between all panes.

## 3. Generative UI Logic

- **Adaptive UI:** The Agent decides which component is best suited for the data (e.g., choosing a `Markdown` component for docs vs. a `BarChart` for benchmarks).
- **Contextual Actions:** The bottom bar is no longer static. If an artifact is a `GitDiff`, the AI populates the bar with "Approve", "Regenerate", or "Discard".

## 4. Implementation Roadmap (Extended)

- **Task 1-3:** Core Backend/Frontend/Monorepo setup (as previously planned).
- **Task 4 (New):** Implementation of the **Artifact Registry** and **Resizable Layout Logic**.
- **Task 5 (New):** Integration of the **Dynamic Action Bar**.

## 5. Visual Identity

Maintains the `pi-mono` minimalist aesthetic:

- **Colors:** Deep Black (#000), Zinc Grey, High-contrast Green (#4ade80) for status.
- **Typography:** Monospace throughout.
- **Animations:** Subtle "Pulse" for thinking, "Slide-up" for new artifacts.
