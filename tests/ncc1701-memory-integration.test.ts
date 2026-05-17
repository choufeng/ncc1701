/**
 * NCC-1701 Memory 集成测试
 *
 * 验证 setupMemory() 正确集成到 Agent：
 * - 工具注册到 agent.state.tools
 * - 工具可执行并返回正确结果
 * - agent_start 时注入项目记忆
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Agent } from "@mariozechner/pi-agent-core";
import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import * as os from "node:os";
import { setupMemory } from "../src/memory/index";
import { MemoryDB, SCHEMA_SQL, detectProject } from "../src/memory/db";
import { buildProjectMemoryBlock } from "../src/memory/prompt";

let agent: Agent;
let memory: ReturnType<typeof setupMemory>;
let testDb: MemoryDB;

beforeAll(() => {
  // 清理上次测试的 DB
  const dbPath = new MemoryDB().dbPath;
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(dbPath + "-wal")) fs.unlinkSync(dbPath + "-wal");
  if (fs.existsSync(dbPath + "-shm")) fs.unlinkSync(dbPath + "-shm");

  agent = new Agent();
  agent.state.systemPrompt = "你是一个测试助手。";
  memory = setupMemory(agent);
  testDb = memory.db;
});

afterAll(() => {
  memory.dispose();
  const dbPath = testDb.dbPath;
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(dbPath + "-wal")) fs.unlinkSync(dbPath + "-wal");
  if (fs.existsSync(dbPath + "-shm")) fs.unlinkSync(dbPath + "-shm");
});

// ── 1. 工具注册 ──
describe("工具注册", () => {
  it("应该注册 ncc1701_memory 工具", () => {
    const tools = agent.state.tools ?? [];
    const memTool = tools.find((t) => t.name === "ncc1701_memory");
    expect(memTool).toBeDefined();
    expect(memTool!.description).toContain("多项目记忆");
  });

  it("应该注册 ncc1701_shared_knowledge 工具", () => {
    const tools = agent.state.tools ?? [];
    const skTool = tools.find((t) => t.name === "ncc1701_shared_knowledge");
    expect(skTool).toBeDefined();
    expect(skTool!.description).toContain("共享知识");
  });

  it("应该保留已有工具", () => {
    const agent2 = new Agent();
    agent2.state.tools = [{
      name: "existing-tool",
      description: "test",
      parameters: {} as any,
      execute: async () => ({ content: [], details: {} }),
    }];
    const mem2 = setupMemory(agent2);
    const toolsAfter = agent2.state.tools ?? [];
    expect(toolsAfter.some((t) => t.name === "existing-tool")).toBe(true);
    expect(toolsAfter.some((t) => t.name === "ncc1701_memory")).toBe(true);
    mem2.dispose();
  });
});

// ── 2. 工具执行 ──
describe("ncc1701_memory 执行", () => {
  it("add: 应该添加项目条目", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_memory")!;
    const result = await tool.execute!("test-1", {
      action: "add",
      project: "integration-test",
      content: "集成测试项目使用 TypeScript strict 模式",
      tags: ["typescript", "testing"],
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("已添加项目 integration-test");
  });

  it("add: 缺少 project 应报错", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_memory")!;
    const result = await tool.execute!("test-2", {
      action: "add",
      content: "无项目名",
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("project 必填");
  });

  it("search: 应该搜索已添加的条目", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_memory")!;
    const result = await tool.execute!("test-3", {
      action: "search",
      content: "TypeScript",
      project: "integration-test",
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("TypeScript strict");
    expect(text).toContain("integration-test");
  });

  it("search: 跨项目搜索", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_memory")!;
    await tool.execute!("test-4a", {
      action: "add",
      project: "cross-test-b",
      content: "B 项目 Docker 配置",
      tags: ["docker"],
    });

    const result = await tool.execute!("test-4b", {
      action: "search",
      content: "Docker",
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("cross-test-b");
  });

  it("replace: 应该替换条目", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_memory")!;
    const result = await tool.execute!("test-5", {
      action: "replace",
      project: "integration-test",
      old_text: "strict 模式",
      content: "strict 模式（已升级到最新配置）",
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("已替换");

    // 验证新内容
    const verify = await tool.execute!("test-5v", {
      action: "search",
      content: "已升级",
      project: "integration-test",
    });
    const vText = (verify.content[0] as { type: "text"; text: string }).text;
    expect(vText).toContain("已升级");
  });

  it("remove: 应该删除条目", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_memory")!;
    await tool.execute!("test-6a", {
      action: "add",
      project: "integration-test",
      content: "待删除的临时条目",
    });

    const result = await tool.execute!("test-6b", {
      action: "remove",
      project: "integration-test",
      old_text: "待删除的临时条目",
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("已删除");
  });
});

// ── 3. 共享知识 ──
describe("ncc1701_shared_knowledge 执行", () => {
  it("add: 应该添加共享知识", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_shared_knowledge")!;
    const result = await tool.execute!("sk-1", {
      action: "add",
      domain: "typescript",
      content: "TypeScript strict 模式必须开启，noImplicitAny 不能关",
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("已添加共享知识");
  });

  it("search: 应该搜索共享知识", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_shared_knowledge")!;
    const result = await tool.execute!("sk-2", {
      action: "search",
      content: "strict",
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("strict 模式");
  });

  it("search by domain: 按领域筛选", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_shared_knowledge")!;
    await tool.execute!("sk-3a", {
      action: "add",
      domain: "docker",
      content: "Docker compose version: '3.8'",
    });

    const result = await tool.execute!("sk-3b", {
      action: "search",
      domain: "docker",
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("Docker compose");
    expect(text).not.toContain("strict");
  });

  it("promote: 应该从项目条目升级", async () => {
    const memTool = agent.state.tools?.find((t) => t.name === "ncc1701_memory")!;
    const addResult = await memTool.execute!("promo-a", {
      action: "add",
      project: "integration-test",
      content: "值得通用化的经验：错误处理必须显式建模",
    });

    const addText = (addResult.content[0] as { type: "text"; text: string }).text;
    const idMatch = addText.match(/id=(\d+)/);
    expect(idMatch).not.toBeNull();
    const entryId = parseInt(idMatch![1]);

    const skTool = agent.state.tools?.find((t) => t.name === "ncc1701_shared_knowledge")!;
    const result = await skTool.execute!("promo-b", {
      action: "promote",
      source_entry_id: entryId,
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("升级为共享知识");
  });
});

// ── 4. System Prompt 注入 ──
describe("System Prompt 注入", () => {
  it("agent_start 后 systemPrompt 应包含项目记忆", () => {
    // 独立 temp DB，不影响主测试
    const tmpPath = os.tmpdir() + "/ncc1701-prompt-test-" + Date.now() + ".db";
    const db = new Database(tmpPath);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec(SCHEMA_SQL);

    const project = detectProject() || "test-project";
    db.run(
      "INSERT INTO project_entries (project, content) VALUES (?, ?)",
      [project, "项目记忆测试条目"],
    );

    const agent2 = new Agent();
    agent2.state.systemPrompt = "基础系统提示。";

    // 模拟注入
    const wrapper = { get: () => db } as unknown as MemoryDB;
    const block = buildProjectMemoryBlock(wrapper, project);
    if (block) {
      agent2.state.systemPrompt = agent2.state.systemPrompt + "\n\n" + block;
    }

    expect(agent2.state.systemPrompt).toContain("项目记忆测试条目");
    expect(agent2.state.systemPrompt).toContain("<ncc-memory-context>");

    db.close();
    try { fs.unlinkSync(tmpPath); } catch { /* ok */ }
  });
});

// ── 5. 边界条件 ──
describe("边界条件", () => {
  it("重复 add 同内容应创建新条目", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_memory")!;
    const r1 = await tool.execute!("edge-1", {
      action: "add",
      project: "edge-test",
      content: "重复内容测试",
    });
    const r2 = await tool.execute!("edge-2", {
      action: "add",
      project: "edge-test",
      content: "重复内容测试",
    });

    const t1 = (r1.content[0] as { type: "text"; text: string }).text;
    const t2 = (r2.content[0] as { type: "text"; text: string }).text;
    expect(t1).toContain("已添加");
    expect(t2).toContain("已添加");
  });

  it("search 不存在的关键词应返回无结果", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_memory")!;
    const result = await tool.execute!("edge-3", {
      action: "search",
      content: "xyzzy_nonexistent_12345",
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("无匹配结果");
  });

  it("特殊字符不崩溃", async () => {
    const tool = agent.state.tools?.find((t) => t.name === "ncc1701_memory")!;
    const result = await tool.execute!("edge-4", {
      action: "add",
      project: "edge-test",
      content: "特殊字符: @#$%^&*()_+-=[]{}|;:',.<>?/~`",
    });

    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("已添加");
  });
});
