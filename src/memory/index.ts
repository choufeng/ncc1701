/**
 * 项目 Memory 集成入口
 *
 * setupMemory() 绑定 MemoryDB 到 Agent 生命周期：
 * - agent_start 时注入项目记忆
 * - 注册 project_memory 和 shared_knowledge 工具
 */

import type { Agent, AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core"
import { Type, StringEnum, type Static } from "@mariozechner/pi-ai"
import { MemoryDB, detectProject } from "./db"
import { projectMemory, sharedKnowledge } from "./tools"
import type { ProjectMemoryParams, SharedKnowledgeParams } from "./tools"
import { buildProjectMemoryBlock } from "./prompt"

// ⚠️ 副作用：修改 agent.state、订阅 agent 生命周期

// ============================================================================
// Tool Parameter Schemas
// ============================================================================

const ProjectMemoryParamsSchema = Type.Object({
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

function createProjectMemoryTool(db: MemoryDB): AgentTool<typeof ProjectMemoryParamsSchema> {
  return {
    name: "project_memory",
    label: "Project Memory",
    description:
      "多项目记忆。管理项目专属记忆，支持标签和跨项目搜索。" +
      "全局记忆用 memory 工具，项目记忆用此工具。",
    parameters: ProjectMemoryParamsSchema,
    async execute(_id, params): Promise<AgentToolResult<void>> {
      const text = await projectMemory(db, params as ProjectMemoryParams);
      return { content: [{ type: "text", text }], details: undefined };
    },
  };
}

function createSharedKnowledgeTool(db: MemoryDB): AgentTool<typeof SharedKnowledgeParamsSchema> {
  return {
    name: "shared_knowledge",
    label: "Shared Knowledge",
    description:
      "共享知识层。管理跨项目通用知识（如 TypeScript 最佳实践、Docker 配置经验）。" +
      "action: add|search|promote。promote 从项目条目升级到共享层。",
    parameters: SharedKnowledgeParamsSchema,
    async execute(_id, params): Promise<AgentToolResult<void>> {
      const text = await sharedKnowledge(db, params as SharedKnowledgeParams);
      return { content: [{ type: "text", text }], details: undefined };
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
    createProjectMemoryTool(db),
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
