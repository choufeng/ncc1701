# Design Spec: High-Performance AI Agent with ElysiaJS & pi-mono

**Date:** 2026-04-28
**Status:** Draft
**Topic:** Integration of ElysiaJS (Backend) and pi-mono (Agent Logic & Web UI) within the `ncc1701` Monorepo.

## 1. Executive Summary

This document outlines the architecture for a high-performance AI Agent system designed to handle long-running tasks. The system leverages **ElysiaJS** for a high-throughput, type-safe backend infrastructure on Bun, and **pi-mono** for core agentic reasoning and a professional, minimalist Web UI.

## 2. Architecture Overview

The system follows a decoupled Client-Server model optimized for real-time state synchronization via WebSockets.

### 2.1 Component Breakdown

- **Backend (apps/agent-backend):**
  - **Framework:** ElysiaJS (Bun runtime).
  - **Core Engine:** `@pi-mono/core` for LLM orchestration.
  - **Communication:** WebSockets for real-time streaming of thoughts and tool execution logs.
  - **Security:** Tool-call approval gate (Human-in-the-loop).
- **Frontend (apps/agent-web-ui):**
  - **Framework:** React + Vite.
  - **UI Library:** `@pi-mono/web-ui` for task timelines and agent message streams.
  - **Visual Style:** Ultra-minimalist, monospace/pixel-art aesthetic.
- **Shared (packages/api-schema):**
  - **Type Safety:** Shared TypeScript types for WebSocket messages via Elysia's `Eden`.

## 3. Core Workflows

### 3.1 Long-Running Task Processing

1. User sends a prompt via Web UI.
2. Backend instantiates a `pi-mono` Agent.
3. Agent breaks down the task into a `TaskTimeline`.
4. As the Agent works, it pushes updates through WebSocket:
   - `THOUGHT`: Current reasoning.
   - `TOOL_CALL`: Requesting system access (e.g., shell command).
   - `STDOUT`: Real-time output from running processes.
5. User provides approval for sensitive operations.

### 3.2 Tool Execution Environment

The Agent is granted "hands" via a custom Toolbox:

- **FileSystem:** Read/Write access to the project root.
- **Shell:** Ability to execute `Bun.spawn` for tests, builds, and git operations.
- **Context:** Access to Monorepo structure for cross-package refactoring.

## 4. Implementation Details

### 4.1 Directory Structure

```text
ncc1701/
├── apps/
│   ├── agent-backend/    # Elysia + pi-mono/core
│   └── agent-web-ui/     # React + pi-mono/web-ui
└── packages/
    └── api-schema/       # Shared TS types
```

### 4.2 Key Technologies

- **Runtime:** Bun (for maximum performance and native `spawn`/`file` APIs).
- **Web Framework:** ElysiaJS (Fastest Bun framework with End-to-End types).
- **Agent Toolkit:** pi-mono (Specialized in coding agents and minimalist UI).

## 5. Success Criteria

- Agent can successfully execute a 2+ minute task (e.g., code refactor + test run) without connection drops.
- UI provides real-time feedback for every step of the agent's process.
- Zero-runtime type errors between Frontend and Backend.
