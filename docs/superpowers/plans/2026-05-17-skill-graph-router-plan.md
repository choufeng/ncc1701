# Skill Graph 路由系统 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 ncc1701 项目中实现基于 pi-subagents 的三级 Skill Graph 路由系统，含 1 个完整 compound 示例

**Architecture:** AGENTS.md 注入路由规则 → Enforcer 扩展拦截 read 验证层级 → compound → molecule → atom 三级 Skill 文件 + 2 个自定义 subagent

**Tech Stack:** TypeScript (Enforcer 扩展), Markdown (Skill 文件 + Agent 文件), pi-subagents

**Spec:** `docs/superpowers/specs/2026-05-17-skill-graph-router-design.md`

---

### Task 1: 创建目录结构

**Files:**
- Create: `.pi/skills/compound-requirement-analysis/` 目录
- Create: `.pi/skills/molecule-jira-fetch/` 目录
- Create: `.pi/skills/molecule-memory-merge/` 目录
- Create: `.pi/skills/molecule-code-analysis/` 目录
- Create: `.pi/skills/molecule-summary/` 目录
- Create: `.pi/skills/atom-jira-read/` 目录
- Create: `.pi/skills/atom-jira-related/` 目录
- Create: `.pi/skills/atom-memory-search/` 目录
- Create: `.pi/skills/atom-context-merge/` 目录
- Create: `.pi/skills/atom-code-search/` 目录
- Create: `.pi/skills/atom-code-trace/` 目录
- Create: `.pi/skills/atom-code-evaluate/` 目录
- Create: `.pi/skills/atom-summary-generate/` 目录
- Create: `.pi/skills/atom-skill-display/` 目录
- Create: `.pi/extensions/` 目录
- Create: `.pi/agents/` 目录

- [ ] **Step 1: 创建所有目录**

```bash
cd /Users/jia.xia/development/ncc1701
mkdir -p .pi/skills/compound-requirement-analysis
mkdir -p .pi/skills/molecule-jira-fetch
mkdir -p .pi/skills/molecule-memory-merge
mkdir -p .pi/skills/molecule-code-analysis
mkdir -p .pi/skills/molecule-summary
mkdir -p .pi/skills/atom-jira-read
mkdir -p .pi/skills/atom-jira-related
mkdir -p .pi/skills/atom-memory-search
mkdir -p .pi/skills/atom-context-merge
mkdir -p .pi/skills/atom-code-search
mkdir -p .pi/skills/atom-code-trace
mkdir -p .pi/skills/atom-code-evaluate
mkdir -p .pi/skills/atom-summary-generate
mkdir -p .pi/skills/atom-skill-display
mkdir -p .pi/extensions
mkdir -p .pi/agents
```

- [ ] **Step 2: 验证目录结构**

```bash
ls -R .pi/skills/
ls .pi/extensions/
ls .pi/agents/
```

- [ ] **Step 3: Commit**

```bash
git add .pi/
git commit -m "chore: create Skill Graph directory structure"
```

---

### Task 2: AGENTS.md 路由规则

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: 在 AGENTS.md 末尾追加路由规则**

```markdown
## Skill Graph 路由规则

当接收到用户消息时，先分析意图进行分类：

### 直接回答（direct）
匹配条件：纯知识问答、概念解释、代码片段询问、聊天、无操作意图
行为：直接回答，不触发任何 skill

### 调度工具（tool）
匹配条件：含操作动词 + 明确工具指向（如"查数据库"、"调 API"、"发消息"、"执行迁移"）
行为：调用 `tool-dispatcher` subagent 执行

### 专业流程（compound）
匹配条件：匹配任一 compound SKILL.md description 中的触发场景
行为：`read` 对应 compound SKILL.md，按 molecule → atom 三级流程执行

### 模糊场景
上述均不匹配时，自行判断最优路径
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "feat: add Skill Graph routing rules to AGENTS.md"
```

---

### Task 3: Skill Graph 拓扑定义

**Files:**
- Create: `.pi/extensions/skill-graph-enforcer.ts`

- [ ] **Step 1: 写入 SKILL_GRAPH 拓扑定义**

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

// ============================================================================
// 1. Skill Graph 拓扑定义
// ============================================================================

interface SkillNode {
  name: string;
  layer: "compound" | "molecule" | "atom";
  delegatesTo: string[];
  standalone: boolean;
}

const SKILL_GRAPH: SkillNode[] = [
  // Compounds
  {
    name: "compound-requirement-analysis",
    layer: "compound",
    delegatesTo: [
      "molecule-jira-fetch",
      "molecule-memory-merge",
      "molecule-code-analysis",
      "molecule-summary",
    ],
    standalone: false,
  },

  // Molecules
  {
    name: "molecule-jira-fetch",
    layer: "molecule",
    delegatesTo: ["atom-jira-read", "atom-jira-related"],
    standalone: false,
  },
  {
    name: "molecule-memory-merge",
    layer: "molecule",
    delegatesTo: ["atom-memory-search", "atom-context-merge"],
    standalone: false,
  },
  {
    name: "molecule-code-analysis",
    layer: "molecule",
    delegatesTo: [
      "atom-code-search",
      "atom-code-trace",
      "atom-code-evaluate",
    ],
    standalone: false,
  },
  {
    name: "molecule-summary",
    layer: "molecule",
    delegatesTo: ["atom-summary-generate", "atom-skill-display"],
    standalone: false,
  },

  // Atoms (all standalone)
  {
    name: "atom-jira-read",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-jira-related",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-memory-search",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-context-merge",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-code-search",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-code-trace",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-code-evaluate",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-summary-generate",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-skill-display",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
];

const SKILL_MAP = new Map(SKILL_GRAPH.map((s) => [s.name, s]));
```

- [ ] **Step 2: Commit**

```bash
git add .pi/extensions/skill-graph-enforcer.ts
git commit -m "wip: add SKILL_GRAPH topology definition"
```

---

### Task 4: Enforcer 扩展 - 运行时状态与验证

**Files:**
- Modify: `.pi/extensions/skill-graph-enforcer.ts`

- [ ] **Step 1: 在拓扑定义后追加运行时状态与验证逻辑**

```typescript
// ============================================================================
// 2. 运行时状态
// ============================================================================

interface LoadingState {
  loadedSkills: Set<string>;
  activeCompound: string | null;
  loadHistory: Array<{
    skill: string;
    timestamp: number;
    context: string;
  }>;
}

function createLoadingState(): LoadingState {
  return {
    loadedSkills: new Set(),
    activeCompound: null,
    loadHistory: [],
  };
}

// ============================================================================
// 3. 核心验证逻辑
// ============================================================================

function detectSkillNameFromPath(path: string): string | null {
  const match = path.match(/skills\/([^/]+)\//);
  return match ? match[1] : null;
}

function validateTopDownLoading(
  targetSkill: string,
  state: LoadingState
): { valid: boolean; reason?: string; suggestion?: string } {
  const node = SKILL_MAP.get(targetSkill);

  // 不在 Graph 中的 skill，不干预
  if (!node) return { valid: true };

  // Compound 始终是入口点
  if (node.layer === "compound") return { valid: true };

  // standalone skill 允许独立调用
  if (node.standalone) return { valid: true };

  // Molecule：检查父 compound 是否已加载
  if (node.layer === "molecule") {
    const parents = SKILL_GRAPH.filter(
      (s) =>
        s.layer === "compound" && s.delegatesTo.includes(targetSkill)
    );
    if (!parents.some((p) => state.loadedSkills.has(p.name))) {
      return {
        valid: false,
        reason: `跨层违规：molecule "${targetSkill}" 被直接加载，但其父 compound 尚未加载`,
        suggestion: `请先加载以下 compound 之一：${parents
          .map((p) => p.name)
          .join(", ")}`,
      };
    }
  }

  // Atom：检查父 molecule 是否已加载
  if (node.layer === "atom") {
    const parents = SKILL_GRAPH.filter(
      (s) =>
        s.layer === "molecule" && s.delegatesTo.includes(targetSkill)
    );
    if (!parents.some((p) => state.loadedSkills.has(p.name))) {
      return {
        valid: false,
        reason: `跨层违规：atom "${targetSkill}" 被直接加载，跳过了 molecule 层`,
        suggestion: `请先加载以下 molecule 之一：${parents
          .map((p) => p.name)
          .join(", ")}`,
      };
    }
  }

  return { valid: true };
}

function detectCircularDependency(
  targetSkill: string,
  state: LoadingState
): { hasCycle: boolean; cycle?: string } {
  const recentSkills = state.loadHistory.slice(-10).map((h) => h.skill);
  const seen = new Set<string>();
  for (const skill of recentSkills) {
    if (seen.has(skill)) {
      return {
        hasCycle: true,
        cycle: `检测到潜在循环依赖：${skill} 被重复加载`,
      };
    }
    seen.add(skill);
  }
  return { hasCycle: false };
}
```

- [ ] **Step 2: Commit**

```bash
git add .pi/extensions/skill-graph-enforcer.ts
git commit -m "wip: add Enforcer runtime state and validation logic"
```

---

### Task 5: Enforcer 扩展 - 提示词生成与事件处理

**Files:**
- Modify: `.pi/extensions/skill-graph-enforcer.ts`

- [ ] **Step 1: 追加提示词生成和事件处理代码**

```typescript
// ============================================================================
// 4. 生成 Skill Graph 拓扑提示
// ============================================================================

function generateGraphPrompt(): string {
  let prompt = `\n## Skill Graph 加载规则\n\n`;
  prompt += `你必须严格按照以下层级结构加载 skill，从顶层 compound 开始，逐层向下：\n\n`;

  for (const compound of SKILL_GRAPH.filter(
    (s) => s.layer === "compound"
  )) {
    prompt += `**${compound.name}**\n`;
    for (const moleculeName of compound.delegatesTo) {
      const molecule = SKILL_MAP.get(moleculeName);
      prompt += `  └─ ${moleculeName}\n`;
      if (molecule) {
        for (const atomName of molecule.delegatesTo) {
          prompt += `     └─ ${atomName}\n`;
        }
      }
    }
    prompt += `\n`;
  }

  prompt += `### 强制规则\n`;
  prompt += `1. **必须从 compound 开始**：先加载 compound SKILL.md，再按需加载其依赖的 molecule\n`;
  prompt += `2. **不跨层调用**：compound 只调用 molecule，molecule 只调用 atom，atom 不调用任何 skill\n`;
  prompt += `3. **按需加载**：只有在执行到需要某层 skill 的步骤时才 read 对应的 SKILL.md\n`;
  prompt += `4. **禁止循环依赖**：不得重复加载同一个 skill\n\n`;

  const standaloneAtoms = SKILL_GRAPH.filter(
    (s) => s.layer === "atom" && s.standalone
  );
  if (standaloneAtoms.length > 0) {
    prompt += `### Standalone Skills（可独立调用）\n`;
    prompt += `以下 atom 被标记为 standalone，可被子 Agent 直接调用：\n`;
    for (const atom of standaloneAtoms) {
      prompt += `- \`${atom.name}\`\n`;
    }
    prompt += `\n`;
  }

  prompt += `### 加载模板\n`;
  prompt += `1. read compound-xxx/SKILL.md        ← 入口点，了解整体流程\n`;
  prompt += `2. read molecule-yyy/SKILL.md        ← 按需加载当前步骤需要的 molecule\n`;
  prompt += `3. read atom-zzz/SKILL.md            ← molecule 指引你加载需要的 atom\n`;
  prompt += `4. 执行 atom 的操作\n`;
  prompt += `5. 返回 molecule 继续下一步骤\n`;

  return prompt;
}
```

- [ ] **Step 2: Commit**

```bash
git add .pi/extensions/skill-graph-enforcer.ts
git commit -m "wip: add graph prompt generator"
```

---

### Task 6: Enforcer 扩展 - 注册与导出

**Files:**
- Modify: `.pi/extensions/skill-graph-enforcer.ts`

- [ ] **Step 1: 追加扩展注册逻辑**

```typescript
// ============================================================================
// 5. 扩展注册
// ============================================================================

export default function skillGraphEnforcer(api: ExtensionAPI): void {
  const state = createLoadingState();

  // 每次 Agent 启动前注入 Skill Graph 拓扑
  api.on("before_agent_start", (ctx) => {
    const graphPrompt = generateGraphPrompt();
    ctx.additionalContext = (ctx.additionalContext || "") + graphPrompt;
  });

  // 拦截 read 工具调用，验证层级关系
  api.on("tool_call", (ctx) => {
    if (ctx.toolName !== "read") return;

    const skillName = detectSkillNameFromPath(ctx.args.path || "");
    if (!skillName) return;

    // 循环检测
    const cycleCheck = detectCircularDependency(skillName, state);
    if (cycleCheck.hasCycle) {
      api.showMessage({
        type: "warning",
        text: cycleCheck.cycle!,
      });
      return;
    }

    // 层级验证
    const validation = validateTopDownLoading(skillName, state);
    if (!validation.valid) {
      api.showMessage({
        type: "error",
        text: `${validation.reason}\n${validation.suggestion}`,
      });
      return;
    }

    // 记录加载历史
    state.loadHistory.push({
      skill: skillName,
      timestamp: Date.now(),
      context: "tool_call",
    });
  });

  // read 返回后更新加载状态
  api.on("tool_result", (ctx) => {
    if (ctx.toolName !== "read") return;

    const skillName = detectSkillNameFromPath(ctx.args.path || "");
    if (!skillName) return;

    const node = SKILL_MAP.get(skillName);
    if (!node) return;

    state.loadedSkills.add(skillName);

    // 记录 activeCompound
    if (node.layer === "compound") {
      state.activeCompound = skillName;
    }
  });

  // 会话重置
  api.on("session_start", () => {
    state.loadedSkills.clear();
    state.activeCompound = null;
    state.loadHistory = [];
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add .pi/extensions/skill-graph-enforcer.ts
git commit -m "feat: complete skill-graph-enforcer extension"
```

---

### Task 7: 创建 8 个 Atom Skill 文件

**Files:**
- Create: `.pi/skills/atom-jira-read/SKILL.md`
- Create: `.pi/skills/atom-jira-related/SKILL.md`
- Create: `.pi/skills/atom-memory-search/SKILL.md`
- Create: `.pi/skills/atom-context-merge/SKILL.md`
- Create: `.pi/skills/atom-code-search/SKILL.md`
- Create: `.pi/skills/atom-code-trace/SKILL.md`
- Create: `.pi/skills/atom-code-evaluate/SKILL.md`
- Create: `.pi/skills/atom-summary-generate/SKILL.md`
- Create: `.pi/skills/atom-skill-display/SKILL.md`

- [ ] **Step 1: 写入 atom-jira-read/SKILL.md**

```markdown
---
name: atom-jira-read
description: >-
  读取单条 Jira Issue 的详细信息，返回标题、描述、状态、指派人等字段。
  触发场景：需要获取指定 Jira Issue 的详细内容时。
layer: atom
metadata:
  standalone: true
---

## 用途
读取单条 Jira Issue 的完整信息。

## 前置条件
- 提供有效的 Jira Issue Key（如 PROJECT-123）
- 需要 Jira API 访问权限（暂为桩实现）

## 输入
- `issueKey`: Jira Issue Key 字符串

## 执行步骤
1. 校验 issueKey 格式（PROJECT-数字）
2. 调用 Jira REST API `GET /rest/api/2/issue/{issueKey}`
3. 解析响应，提取 title、description、status、assignee、priority
4. 返回结构化数据

## 输出
```json
{
  "issueKey": "string",
  "title": "string",
  "description": "string",
  "status": "string",
  "assignee": "string | null",
  "priority": "string"
}
```

## 错误处理
- issueKey 格式无效 → 报告格式错误，要求重新输入
- API 请求失败 → 报告网络错误，建议重试
- Issue 不存在 → 报告 404，确认 issueKey 正确性
```

- [ ] **Step 2: 写入 atom-jira-related/SKILL.md**

```markdown
---
name: atom-jira-related
description: >-
  获取与指定 Jira Issue 相关联的其他 Issue 列表。触发场景：需要了解某个需求的周边依赖和关联项时。
layer: atom
metadata:
  standalone: true
---

## 用途
获取 Jira Issue 的关联 Issue 列表。

## 前置条件
- 提供有效的 Jira Issue Key
- 需要 Jira API 访问权限（暂为桩实现）

## 输入
- `issueKey`: Jira Issue Key 字符串
- `relationTypes`: 关联类型过滤（可选，如 "blocks", "relates to"）

## 执行步骤
1. 校验 issueKey 格式
2. 调用 Jira API `GET /rest/api/2/issue/{issueKey}/remotelink` 和 issuelink 接口
3. 按 relationTypes 过滤关联 Issue
4. 返回关联 Issue 列表

## 输出
```json
{
  "issueKey": "string",
  "related": [
    {
      "issueKey": "string",
      "relationType": "string",
      "title": "string",
      "status": "string"
    }
  ]
}
```

## 错误处理
- 无关联 Issue → 返回空列表，不视为错误
- API 请求失败 → 报告网络错误
```

- [ ] **Step 3: 写入 atom-memory-search/SKILL.md**

```markdown
---
name: atom-memory-search
description: >-
  在记忆库中搜索与当前需求相关的内容。触发场景：需要融合已有知识和经验时。
layer: atom
metadata:
  standalone: true
---

## 用途
在 long-term memory 中搜索与当前主题相关的内容。

## 前置条件
- memory_search 工具可用
- 有明确的搜索 query

## 输入
- `query`: 搜索关键词
- `filters`: 可选过滤条件（如 category, project 等）

## 执行步骤
1. 使用 memory_search 工具执行搜索
2. 按相关度排序搜索结果
3. 提取 top-N 结果的关键信息

## 输出
```json
{
  "query": "string",
  "results": [
    {
      "content": "string",
      "relevance": "string",
      "source": "string"
    }
  ]
}
```

## 错误处理
- 无匹配结果 → 返回空列表，继续流程
- memory_search 不可用 → 跳过此步骤，标注原因
```

- [ ] **Step 4: 写入 atom-context-merge/SKILL.md**

```markdown
---
name: atom-context-merge
description: >-
  将记忆搜索结果与当前需求上下文融合，产生综合上下文。触发场景：需要结合已有知识和新需求时。
layer: atom
metadata:
  standalone: true
---

## 用途
将记忆搜索结果与当前需求上下文融合，产生结构化综合上下文。

## 前置条件
- 已执行 atom-memory-search 获得记忆搜索结果
- 已获得 Jira Issue 信息

## 输入
- `memoryResults`: atom-memory-search 的输出
- `jiraContext`: Jira Issue 信息（标题、描述等）
- `currentRequirement`: 当前用户需求描述

## 执行步骤
1. 对比记忆结果与 Jira 需求，标记匹配点和差异点
2. 融合为统一上下文结构
3. 标注已知的经验教训和注意事项

## 输出
```json
{
  "mergedContext": "string",
  "matchedKnowledge": ["string"],
  "gaps": ["string"],
  "lessonsLearned": ["string"]
}
```

## 错误处理
- 输入数据不完整 → 标注缺失字段，用已有数据继续
```

- [ ] **Step 5: 写入 atom-code-search/SKILL.md**

```markdown
---
name: atom-code-search
description: >-
  在代码库中搜索与需求相关的文件和代码片段。触发场景：需要定位与需求相关的代码时。
layer: atom
metadata:
  standalone: true
---

## 用途
在项目代码库中搜索与需求相关的代码。

## 前置条件
- 有明确的搜索目标（关键词、函数名、文件名模式）
- grep/find/glob 工具可用

## 输入
- `keywords`: 搜索关键词列表
- `filePatterns`: 文件名匹配模式（可选，如 "*.ts", "*.test.ts"）

## 执行步骤
1. 对每个 keyword 执行 grep 搜索
2. 对 filePatterns 执行 find 查找
3. 汇总匹配文件路径和行号
4. 去重并排序

## 输出
```json
{
  "matches": [
    {
      "file": "string",
      "line": "number",
      "content": "string"
    }
  ],
  "totalFiles": "number",
  "searchKeywords": ["string"]
}
```

## 错误处理
- 无匹配结果 → 返回空列表，扩大搜索范围或调整关键词
```

- [ ] **Step 6: 写入 atom-code-trace/SKILL.md**

```markdown
---
name: atom-code-trace
description: >-
  追踪指定代码的调用链和依赖关系。触发场景：需要理解代码的执行路径或依赖关系时。
layer: atom
metadata:
  standalone: true
---

## 用途
追踪代码调用链和依赖关系。

## 前置条件
- atom-code-search 已完成，有入口文件列表
- read 工具可用

## 输入
- `entryFiles`: 入口文件列表（来自 atom-code-search）
- `depth`: 追踪深度（默认 3 层）

## 执行步骤
1. 从 entryFiles 开始读取每个文件
2. 提取 import 语句和函数调用
3. 递归追踪被引用的文件（受 depth 限制）
4. 构建调用关系图

## 输出
```json
{
  "callGraph": {
    "nodes": ["file/path"],
    "edges": [
      { "from": "file/path", "to": "file/path", "type": "import|call" }
    ]
  },
  "entryPoints": ["string"],
  "maxDepth": "number"
}
```

## 错误处理
- 文件不可读 → 跳过并标注
- 循环引用 → 检测到后截断，标注
```

- [ ] **Step 7: 写入 atom-code-evaluate/SKILL.md**

```markdown
---
name: atom-code-evaluate
description: >-
  评估与需求相关的代码，识别实现难度、风险和影响范围。触发场景：需要评估代码变更的影响时。
layer: atom
metadata:
  standalone: true
---

## 用途
评估代码变更难度、风险和影响范围。

## 前置条件
- atom-code-trace 已完成，有调用图
- atom-code-search 已完成，有代码匹配结果

## 输入
- `codeMatches`: atom-code-search 输出
- `callGraph`: atom-code-trace 输出
- `mergedContext`: atom-context-merge 输出

## 执行步骤
1. 分析受影响文件数量和类型
2. 评估变更复杂度（低/中/高）
3. 识别高风险区域（核心逻辑、共享模块）
4. 汇总影响范围

## 输出
```json
{
  "complexity": "low|medium|high",
  "affectedFiles": ["string"],
  "riskAreas": ["string"],
  "estimatedEffort": "string",
  "recommendations": ["string"]
}
```

## 错误处理
- 输入数据不完整 → 基于已有数据评估，标注置信度
```

- [ ] **Step 8: 写入 atom-summary-generate/SKILL.md**

```markdown
---
name: atom-summary-generate
description: >-
  根据所有分析结果生成最终总结报告。触发场景：所有分析步骤完成后需要输出结论时。
layer: atom
metadata:
  standalone: true
---

## 用途
生成结构化最终总结报告。

## 前置条件
- 所有前序 molecule 已完成
- 所有分析数据已就绪

## 输入
- `jiraInfo`: Jira Issue 信息
- `memoryContext`: 记忆融合上下文
- `codeEvaluation`: 代码评估结果

## 执行步骤
1. 汇总三个数据源的结论
2. 按"背景 → 分析 → 影响 → 建议"结构组织
3. 生成 Markdown 格式的总结报告

## 输出
```markdown
# 需求分析总结：[需求标题]

## 背景
[Jira 需求和关联信息摘要]

## 已有知识
[记忆库中的相关经验和教训]

## 代码影响
[受影响的文件和模块、复杂度评估]

## 建议
[具体行动建议和优先级]
```

## 错误处理
- 某个数据源为空 → 在报告中标注"暂无相关数据"
```

- [ ] **Step 9: 写入 atom-skill-display/SKILL.md**

```markdown
---
name: atom-skill-display
description: >-
  使用指定 Skill 格式化并展示总结内容到用户界面。触发场景：需要以特定格式展示结果时。
layer: atom
metadata:
  standalone: true
---

## 用途
使用特定 Skill 格式化并展示总结内容。

## 前置条件
- atom-summary-generate 已完成，有总结报告
- 目标展示 Skill 可用（如 write-blog, visualizing-analysis 等）

## 输入
- `summaryReport`: atom-summary-generate 的输出
- `displaySkill`: 目标展示 Skill 名称（可选，默认直接文本输出）

## 执行步骤
1. 如果指定了 displaySkill，加载并执行对应 Skill
2. 否则直接以 Markdown 格式输出总结
3. 确认内容完整展示

## 输出
以指定形式展示的总结内容。

## 错误处理
- 指定 Skill 不存在 → 回退到直接 Markdown 输出，标注
```

- [ ] **Step 10: Commit**

```bash
git add .pi/skills/atom-*/SKILL.md
git commit -m "feat: add 8 atom skill files (jira-read, jira-related, memory-search, context-merge, code-search, code-trace, code-evaluate, summary-generate, skill-display)"
```

---

### Task 8: 创建 4 个 Molecule Skill 文件

**Files:**
- Create: `.pi/skills/molecule-jira-fetch/SKILL.md`
- Create: `.pi/skills/molecule-memory-merge/SKILL.md`
- Create: `.pi/skills/molecule-code-analysis/SKILL.md`
- Create: `.pi/skills/molecule-summary/SKILL.md`

- [ ] **Step 1: 写入 molecule-jira-fetch/SKILL.md**

```markdown
---
name: molecule-jira-fetch
description: >-
  获取 Jira Issue 信息及其关联 Issue。触发场景：用户提供 Jira URL 或 Issue Key 时。
layer: molecule
delegates-to:
  - atom-jira-read
  - atom-jira-related
---

## 用途
获取指定 Jira Issue 的完整信息和关联 Issue 列表。

## 依赖的原子
使用 read 工具按需加载以下原子 skill：
- `../atom-jira-read/SKILL.md`：读取 Jira Issue 详细信息
- `../atom-jira-related/SKILL.md`：获取关联 Issue 列表

## 编排流程
> **铁律：一次只问一个问题。** 与用户交互时，每次仅提出一个问题。
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

1. 如果用户未提供 Jira Issue Key，询问用户提供：
   - ⭐ 如果用户消息包含 URL，从中提取 issueKey
   - 否则请用户输入 issueKey

2. 加载并执行 `atom-jira-read`：传入 issueKey，获取 Jira Issue 详细信息

3. 加载并执行 `atom-jira-related`：传入 issueKey，获取关联 Issue 列表

4. 汇总两个原子的输出，生成 Jira 信息摘要

## 输出
```json
{
  "primaryIssue": { "issueKey": "string", "title": "string", "description": "string", "status": "string", "assignee": "string | null", "priority": "string" },
  "relatedIssues": [{ "issueKey": "string", "relationType": "string", "title": "string", "status": "string" }],
  "summary": "string"
}
```

## 失败处理
- atom-jira-read 失败 → 终止本 molecule，报告失败原因
- atom-jira-related 失败 → 继续执行，关联列表置空并标注
```

- [ ] **Step 2: 写入 molecule-memory-merge/SKILL.md**

```markdown
---
name: molecule-memory-merge
description: >-
  搜索记忆库并融合为需求上下文。触发场景：需要结合已有知识和经验分析需求时。
layer: molecule
delegates-to:
  - atom-memory-search
  - atom-context-merge
---

## 用途
在记忆库中搜索相关内容，与 Jira 需求信息融合为统一上下文。

## 依赖的原子
使用 read 工具按需加载以下原子 skill：
- `../atom-memory-search/SKILL.md`：搜索记忆库
- `../atom-context-merge/SKILL.md`：融合上下文

## 编排流程
> **铁律：一次只问一个问题。**
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

1. 从 molecule-jira-fetch 输出中提取关键信息作为搜索 query
2. 加载并执行 `atom-memory-search`：传入 query，搜索记忆库
3. 加载并执行 `atom-context-merge`：传入记忆搜索结果 + Jira 信息，融合上下文
4. 输出融合后的综合上下文

## 输出
```json
{
  "mergedContext": "string",
  "matchedKnowledge": ["string"],
  "gaps": ["string"],
  "lessonsLearned": ["string"]
}
```

## 失败处理
- 记忆库不可用 → 跳过本 molecule，标注原因，继续后续步骤
```

- [ ] **Step 3: 写入 molecule-code-analysis/SKILL.md**

```markdown
---
name: molecule-code-analysis
description: >-
  分析代码库中与需求相关的代码。触发场景：需要评估需求对代码的影响时。
layer: molecule
delegates-to:
  - atom-code-search
  - atom-code-trace
  - atom-code-evaluate
---

## 用途
在代码库中搜索、追踪和评估与需求相关的代码。

## 依赖的原子
使用 read 工具按需加载以下原子 skill：
- `../atom-code-search/SKILL.md`：搜索相关代码
- `../atom-code-trace/SKILL.md`：追踪调用链
- `../atom-code-evaluate/SKILL.md`：评估代码影响

## 编排流程
> **铁律：一次只问一个问题。**
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

1. 从上下文融合结果中提取搜索关键词
2. 加载并执行 `atom-code-search`：传入 keywords，定位相关代码文件
3. 并行执行：
   - 加载并执行 `atom-code-trace`：传入匹配文件，追踪调用链
   - （如有多个独立搜索方向，可并发追踪）
4. 加载并执行 `atom-code-evaluate`：传入搜索结果 + 调用图 + 融合上下文，评估影响
5. 输出代码分析结果

## 输出
```json
{
  "codeMatches": [{ "file": "string", "line": "number", "content": "string" }],
  "callGraph": { "nodes": ["string"], "edges": [{ "from": "string", "to": "string", "type": "string" }] },
  "evaluation": { "complexity": "string", "affectedFiles": ["string"], "riskAreas": ["string"], "estimatedEffort": "string", "recommendations": ["string"] }
}
```

## 失败处理
- 无匹配代码 → 报告中标注"未找到相关代码"
```

- [ ] **Step 4: 写入 molecule-summary/SKILL.md**

```markdown
---
name: molecule-summary
description: >-
  生成最终分析总结并使用 Skill 展示。触发场景：所有分析步骤完成后需要向用户呈现结果时。
layer: molecule
delegates-to:
  - atom-summary-generate
  - atom-skill-display
---

## 用途
汇总所有分析结果，生成结构化总结报告并展示。

## 依赖的原子
使用 read 工具按需加载以下原子 skill：
- `../atom-summary-generate/SKILL.md`：生成总结报告
- `../atom-skill-display/SKILL.md`：格式化展示

## 编排流程
> **铁律：一次只问一个问题。**
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

1. 收集所有前序 molecule 的输出
2. 加载并执行 `atom-summary-generate`：传入全部分析数据，生成总结报告
3. 询问用户展示方式：
   - A) 直接文本展示
   - B) 使用 write-blog Skill 保存为文章
   - C) 使用 visualizing-analysis Skill 生成可视化分析 ⭐ 推荐
   - D) 自定义：___
4. 加载并执行 `atom-skill-display`：传入总结报告 + 用户选择的展示方式

## 输出
总结报告（格式取决于用户选择的展示方式）。

## 失败处理
- atom-summary-generate 失败 → 尝试基于已有数据手动组织总结
- atom-skill-display 失败 → 回退到直接文本输出
```

- [ ] **Step 5: Commit**

```bash
git add .pi/skills/molecule-*/SKILL.md
git commit -m "feat: add 4 molecule skill files (jira-fetch, memory-merge, code-analysis, summary)"
```

---

### Task 9: 创建 Compound Skill 文件

**Files:**
- Create: `.pi/skills/compound-requirement-analysis/SKILL.md`

- [ ] **Step 1: 写入 compound-requirement-analysis/SKILL.md**

```markdown
---
name: compound-requirement-analysis
description: >-
  需求分析。触发场景：用户提出需求分析请求、提供 Jira URL、要求分析需求影响范围、或评估需求可行性时。
layer: compound
delegates-to:
  - molecule-jira-fetch
  - molecule-memory-merge
  - molecule-code-analysis
  - molecule-summary
---

## 用途
完整的端到端需求分析流程。从 Jira 需求出发，融合记忆库知识，分析代码影响，最终输出总结报告。

## 人类驱动点
> **铁律：一次只问一个问题。** 每次与用户交互时，仅提出一个问题，等待回答后再继续。
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

- **确认需求来源**：如果用户提供了 Jira URL，自动提取；否则请用户提供
- **确认分析深度**：询问是否需要代码级分析，还是仅需求文本级分析
- **确认展示方式**：在总结阶段询问展示格式

## 依赖的分子
使用 read 工具按需加载以下分子 skill：
- `../molecule-jira-fetch/SKILL.md`：获取 Jira 信息（第一阶段）
- `../molecule-memory-merge/SKILL.md`：搜索记忆融合上下文（第二阶段）
- `../molecule-code-analysis/SKILL.md`：分析代码影响（第三阶段）
- `../molecule-summary/SKILL.md`：生成总结展示（第四阶段）

## 编排策略

### 第一阶段：信息获取
1. 确认用户需求来源（Jira URL / Issue Key）
2. 加载 `molecule-jira-fetch`：获取 Jira 需求和关联信息

### 第二阶段：知识融合
3. 加载 `molecule-memory-merge`：搜索记忆库，融合已有知识和经验

### 第三阶段：代码分析（可选）
4. 询问用户是否需要代码级分析：
   - A) 是，进行完整代码分析 ⭐ 推荐
   - B) 否，仅基于需求文本和记忆知识输出总结
5. 如选 A，加载 `molecule-code-analysis`：搜索、追踪、评估代码影响

### 第四阶段：总结展示
6. 加载 `molecule-summary`：汇总所有结果，按用户选择的方式展示

## 成功标准
- Jira 需求信息已成功获取并解析
- 记忆库相关经验已融合（如可用）
- 代码影响已分析（如用户选择）
- 总结报告已生成并展示给用户

## 已知局限
- Jira 接口为桩实现，真实数据获取需要实际 API 接入
- 代码分析依赖项目结构，大型项目可能耗时较长
- 记忆库依赖 memory_search 工具可用性
```

- [ ] **Step 2: Commit**

```bash
git add .pi/skills/compound-requirement-analysis/SKILL.md
git commit -m "feat: add compound-requirement-analysis skill"
```

---

### Task 10: 创建 Subagent 配置文件

**Files:**
- Create: `.pi/agents/tool-dispatcher.md`
- Create: `.pi/agents/atom-executor.md`

- [ ] **Step 1: 写入 tool-dispatcher.md**

```markdown
---
name: tool-dispatcher
description: 调度工具和数据库操作。接收工具调度指令，执行具体操作并返回结果。
tools: bash, read, grep, find, ls
thinking: low
---

你是一个工具调度器。你的职责是执行工具指令并返回结构化结果。

## 行为规则
1. 精确执行调度指令，不自行扩展操作范围
2. 操作完成后返回简洁的结果摘要
3. 遇到错误时报告具体错误信息，不自行修复
4. 不确定的操作先确认再执行

## 输出格式
```json
{
  "status": "success|failure",
  "action": "描述执行的操作",
  "result": "操作结果",
  "error": "错误信息（如有）"
}
```
```

- [ ] **Step 2: 写入 atom-executor.md**

```markdown
---
name: atom-executor
description: 执行单个 atom skill 的原子操作。接收 skill 名称和输入参数，加载对应 atom 并产出结果。
tools: batch, bash, read, grep, find, ls
thinking: low
inheritSkills: true
---

你是一个原子操作执行器。你的职责是加载并严格按 atom SKILL.md 的指引执行操作。

## 行为规则
1. 收到 atom 名称后，read 对应的 SKILL.md 文件
2. 严格按照 atom 的执行步骤操作，不跳过、不扩展
3. 按 atom 定义的输出格式返回结果
4. 遇到 atom 定义的错误处理规则时，按规则响应
5. 不调用其他 skill，不做编排决策

## 输出格式
严格遵循所加载 atom SKILL.md 中定义的输出格式。
```

- [ ] **Step 3: Commit**

```bash
git add .pi/agents/tool-dispatcher.md .pi/agents/atom-executor.md
git commit -m "feat: add tool-dispatcher and atom-executor subagent configs"
```

---

### Task 11: 集成验证

**Files:** 无新建

- [ ] **Step 1: 验证目录结构完整性**

```bash
cd /Users/jia.xia/development/ncc1701
echo "=== Skills ===" && ls -1 .pi/skills/
echo "=== Extensions ===" && ls -1 .pi/extensions/
echo "=== Agents ===" && ls -1 .pi/agents/
echo "=== AGENTS.md 路由规则 ===" && grep -A5 "Skill Graph 路由规则" AGENTS.md
```

Expected: 1 compound + 4 molecules + 9 atoms, 1 extension, 2 agents, 路由规则存在

- [ ] **Step 2: 验证 Enforcer 扩展加载（检查 TypeScript 语法）**

```bash
npx tsc --noEmit --esModuleInterop --moduleResolution node --target ES2020 --module commonjs .pi/extensions/skill-graph-enforcer.ts
```

Expected: 无编译错误

- [ ] **Step 3: 验证 subagent 配置可发现**

```bash
ls -1 .pi/agents/*.md
```

Expected: 2 个 agent 文件

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: final integration verification"
```
