/**
 * NCC-1701 Memory 集成入口
 *
 * setupMemory() 绑定 MemoryDB 到 Agent 生命周期：
 * - agent_start 时注入项目记忆
 * - 注册 ncc1701_memory 和 ncc1701_shared_knowledge 工具
 */

import type { Agent, AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import { Type, StringEnum, type Static } from "@mariozechner/pi-ai";
import { MemoryDB, detectProject } from "./db";
import { ncc1701Memory, ncc1701SharedKnowledge } from "./tools";
import type { NccMemoryParams, SharedKnowledgeParams } from "./tools";
import { buildProjectMemoryBlock } from "./prompt";

// ============================================================================
// Tool Parameter Schemas
// ============================================================================

const NccMemoryParamsSchema = Type.Object({
  action: StringEnum(["add", "replace", "remove", "search"] as const),
  project: Type.Optional(Type.String({ description: "项目名。add/replace/remove 时必填" })),
  content: Type.Optional(Type.String({ description: "记忆内容（add/replace 用）" })),
  old_text: Type.Optional(Type.String({ description: "要替换/删除的文本片段" })),
  tags: Type.Optional(Type.Array(Type.String(), { description: "标签列表（add 用）" })),
  limit: Type.Optional(Type.Number({ description: "搜索结果上限（默认 10）" })),
});

const SharedKnowledgeParamsSchema = Type.Object({
  action: StringEnum(["add", "search", "promote"] as const),
  content: Type.Optional(Type.String({ description: "知识内容（add 用）" })),
  domain: Type.Optional(Type.String({ description: "领域分类（add/search 用）" })),
  source_entry_id: Type.Optional(Type.Number({ description: "源项目条目 ID（promote 用）" })),
  limit: Type.Optional(Type.Number({ description: "搜索结果上限（默认 10）" })),
});

// ============================================================================
// Tool Definitions
// ============================================================================

function createNccMemoryTool(db: MemoryDB): AgentTool<typeof NccMemoryParamsSchema> {
  return {
    name: "ncc1701_memory",
    label: "NCC Memory",
    description:
      "NCC-1701 多项目记忆。管理项目专属记忆，支持标签和跨项目搜索。" +
      "全局记忆用 memory 工具，项目记忆用此工具。",
    parameters: NccMemoryParamsSchema,
    async execute(_id, params): Promise<AgentToolResult> {
      const text = await ncc1701Memory(db, params as NccMemoryParams);
      return { content: [{ type: "text", text }], details: {} };
    },
  };
}

function createSharedKnowledgeTool(db: MemoryDB): AgentTool<typeof SharedKnowledgeParamsSchema> {
  return {
    name: "ncc1701_shared_knowledge",
    label: "NCC Shared Knowledge",
    description:
      "NCC-1701 共享知识层。管理跨项目通用知识（如 TypeScript 最佳实践、Docker 配置经验）。" +
      "action: add|search|promote。promote 从项目条目升级到共享层。",
    parameters: SharedKnowledgeParamsSchema,
    async execute(_id, params): Promise<AgentToolResult> {
      const text = await ncc1701SharedKnowledge(db, params as SharedKnowledgeParams);
      return { content: [{ type: "text", text }], details: {} };
    },
  };
}

// ============================================================================
// Setup
// ============================================================================

export interface MemorySetup {
  db: MemoryDB;
  dispose: () => void;
}

export function setupMemory(agent: Agent): MemorySetup {
  const db = new MemoryDB();
  db.open();

  // ── 注册工具 ──
  const existingTools = agent.state.tools ?? [];
  const memoryTools = [
    createNccMemoryTool(db),
    createSharedKnowledgeTool(db),
  ];
  agent.state.tools = [...memoryTools, ...existingTools];

  // ── 生命周期 ──
  const unsubscribe = agent.subscribe((event, _signal) => {
    if (event.type === "agent_start") {
      const project = detectProject();
      if (!project) return;

      const block = buildProjectMemoryBlock(db, project);
      if (block) {
        agent.state.systemPrompt = agent.state.systemPrompt + "\n\n" + block;
      }
    }
  });

  return {
    db,
    dispose: () => {
      unsubscribe();
      db.close();
    },
  };
}
