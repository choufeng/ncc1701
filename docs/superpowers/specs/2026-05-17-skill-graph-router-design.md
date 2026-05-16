# Skill Graph 路由系统设计

## 概述

基于 pi-subagents，结合三级 Skill Graph（Compound → Molecule → Atom）架构，实现用户指令智能路由系统。所有用户消息先经路由分类，再分发到三类处理流程。

## 三类处理流程

| 流程 | 触发条件 | 执行方式 |
|------|----------|----------|
| **直接回答** | 纯知识问答、概念解释、代码片段、聊天 | parent 直接回复 |
| **调度工具** | 操作动词 + 明确工具指向 | parent 调用 `tool-dispatcher` agent |
| **专业流程** | 匹配 compound description 触发场景 | parent → compound → molecule → atom |

## 架构

```
                        用户消息
                           │
                           ▼
┌─────────────────────────────────────────────────┐
│  AGENTS.md 路由规则（parent prompt 注入）          │
│                                                   │
│  ① 规则层：关键词/意图快速命中                       │
│  ② 回退层：模糊场景 parent LLM 自行判断              │
│                                                   │
│  输出 → { route: "direct" | "tool" | "compound" }  │
└──────────┬──────────────┬──────────────┬──────────┘
           │              │              │
     direct│         tool │     compound │
           ▼              ▼              ▼
    parent 直接回答   parent 调用    parent read compound
                     tool-dispatcher  SKILL.md
                                        │
                                        ▼
                              ┌──────────────────────┐
                              │  Enforcer 扩展          │
                              │  · 拓扑注入             │
                              │  · read 拦截验证层级     │
                              │  · 循环检测             │
                              │  · standalone 放行      │
                              └──────────┬───────────────┘
                                         │
                                         ▼
                              compound → molecule → atom
                                         │
                                         ▼
                              子 agent 可独立调用 atom
                              （standalone: true）
```

## 三层角色分工

| 角色 | 负责者 | 职责 |
|------|--------|------|
| 路由器 | Parent (AGENTS.md 规则) | 分类消息 → direct / tool / compound |
| 强制执行器 | Enforcer 扩展 (.pi/extensions/) | 拦截 read、验证层级、生成拓扑提示 |
| 执行体 | Skill Graph + Subagent | compound 编排业务流程，atom 原子执行 |

## 路由分类规则

### 直接回答
- 匹配条件：纯知识问答、概念解释、代码片段询问、聊天、无操作意图
- 行为：parent 直接回答

### 调度工具
- 匹配条件：含操作动词 + 明确工具指向（如"查数据库"、"调 API"、"发消息"）
- 行为：parent 调用 `tool-dispatcher` agent 执行

### 专业流程
- 匹配条件：匹配 compound SKILL.md description 中的触发场景
- 行为：read compound SKILL.md，按 molecule → atom 流程执行

### 模糊场景
- 上述均不匹配时，parent 自行判断最优路径

## Skill Graph 目录结构

```
.p i/
├── skills/
│   ├── compound-requirement-analysis/   # 需求分析流程
│   │   └── SKILL.md
│   ├── molecule-jira-fetch/             # Jira 信息获取
│   │   └── SKILL.md
│   ├── molecule-memory-merge/           # 记忆融合
│   │   └── SKILL.md
│   ├── molecule-code-analysis/          # 代码分析
│   │   └── SKILL.md
│   ├── molecule-summary/                # 总结展示
│   │   └── SKILL.md
│   ├── atom-jira-read/                  # 读取 Jira 单条
│   │   └── SKILL.md
│   ├── atom-jira-related/               # 读取关联 Jira
│   │   └── SKILL.md
│   ├── atom-memory-search/              # 搜索记忆库
│   │   └── SKILL.md
│   ├── atom-context-merge/              # 上下文融合
│   │   └── SKILL.md
│   ├── atom-code-search/                # 代码搜索
│   │   └── SKILL.md
│   ├── atom-code-trace/                 # 代码追踪
│   │   └── SKILL.md
│   ├── atom-code-evaluate/              # 代码评估
│   │   └── SKILL.md
│   ├── atom-summary-generate/           # 生成总结
│   │   └── SKILL.md
│   └── atom-skill-display/              # Skill 展示
│       └── SKILL.md
└── extensions/
    └── skill-graph-enforcer.ts          # Enforcer 扩展
```

## Skill 文件规范

### Frontmatter 字段

| 字段 | 必填 | 约束 |
|------|------|------|
| `name` | 是 | 小写字母+数字+连字符，与目录名一致，最长 64 字符 |
| `description` | 是 | 描述"做什么 + 什么场景触发"，最长 1024 字符 |
| `layer` | 是 | 只能取 `atom` / `molecule` / `compound` |
| `delegates-to` | molecule/compound 必填 | 列出所有被调度的下层 skill 名称 |
| `metadata.standalone` | 可选 | `true` 表示可被独立调用，跳过层级验证 |

### 各层正文结构

#### Atom
> 用途 → 前置条件 → 输入 → 执行步骤 → 输出 → 错误处理

#### Molecule
> 用途 → 依赖的原子 → 编排流程 → 输出 → 失败处理
> 编排流程开头注入人机交互规则

#### Compound
> 用途 → 人类驱动点 → 依赖的分子 → 编排策略 → 成功标准 → 已知局限
> 人类驱动点注入人机交互规则

## Enforcer 扩展行为

### ① 系统提示词注入（before_agent_start）
自动追加 Skill Graph 拓扑树到 parent 提示词，包含完整层级结构和 standalone skill 列表。

### ② read 拦截验证（tool_call）
- read compound → ✅ 入口点
- read molecule → ✅ 若父 compound 已加载
- read atom → ✅ 若 standalone=true，或父 molecule 已加载
- read atom → ❌ 若无 standalone 且父 molecule 未加载 → 告警消息

### ③ 循环检测（tool_call）
最近 10 次加载历史中查重，重复 → 告警。

## standalone 策略

| 层级 | standalone | 语义 |
|------|-----------|------|
| Compound | `false` | 必须作为完整工作流入口 |
| Molecule | `false` | 必须由 compound 调度 |
| Atom | `true` | 可由 molecule 调度，也可被子 agent 独立调用 |

## subagent 角色

| Agent | 用途 | 触发 |
|-------|------|------|
| `tool-dispatcher` | 调度工具/数据库操作 | `route === "tool"` |
| `atom-executor` | 执行任意 atom（通过 skill 参数注入） | compound 流程中，子 agent 场景 |

## 人机交互规则

1. **一次只问一个问题**：禁止一次性抛出多个问题
2. **选项推荐规则**：提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入

## 实现边界

- 路由分类规则（AGENTS.md）
- Enforcer 扩展 (.pi/extensions/skill-graph-enforcer.ts)
- 1 个完整 compound 示例：`compound-requirement-analysis` 及其全部 molecule/atom
- 1 个 `tool-dispatcher` agent（占位）
- 1 个 `atom-executor` agent
- atom 内部为桩实现（stub），不接入真实外部系统
