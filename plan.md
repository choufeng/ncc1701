<!-- GSD:project-start source:PROJECT.md -->
## Project

**Pi Agent Demo**

一个基于 pi-mono 核心包构建的最小终端 Agent demo。使用 pi-ai（统一 LLM API）和 pi-agent-core（Agent 运行时），实现一个能调用文件读写、Shell 执行、网页搜索工具的终端聊天 Agent。TUI 层待选型。

**Core Value:** 验证 pi-ai、pi-agent-core 两个包能否协同工作，跑通从用户输入到 LLM 调用再到工具执行再到结果展示的完整链路。

### Constraints

- **技术栈**: TypeScript，使用 pi-mono 的 npm 包作为依赖
- **运行环境**: Node.js 终端
- **复杂度**: 最小可行 — 优先跑通集成，不追求完善的功能
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| @mariozechner/pi-ai | 0.70.6 | 统一多 provider LLM API | pi-mono 生态的核心包。支持 20+ provider（OpenAI、Anthropic、Google、xAI、Groq、Mistral、Bedrock 等），提供流式/非流式调用、工具调用（TypeBox schema）、思考/推理支持、跨 provider 上下文交接、token/成本追踪。内建 `agentLoop` 可自动处理工具调用循环。有完整 TypeScript 类型，`getModel('anthropic', 'claude-sonnet-4-5')` 即可获得类型安全的模型实例。 | HIGH |
| @mariozechner/pi-agent-core | 0.70.6 | Agent 运行时（状态管理、事件流、传输抽象） | 在 pi-ai 的 `agentLoop` 之上提供 `Agent` 类，封装了：状态管理、简化事件订阅、消息队列（one-at-a-time 或 all-at-once 两种模式）、附件处理（图片、文档）、传输抽象（直接运行或通过代理）。依赖 pi-ai 和 typebox。 | HIGH |
| Node.js | >= 20.0.0 | 运行时 | pi-mono 包的最低要求。当前系统 v22.22.2 满足要求。 | HIGH |
| TypeScript | ^5.7.x | 类型系统 | pi-mono 全部用 TypeScript 编写，导出完整 `.d.ts` 类型声明。三个包都是 ESM (`"type": "module"`)。 | HIGH |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typebox | ^1.1.24 | JSON Schema 构建 + 参数验证 | 定义工具参数 schema。已通过 pi-ai 重新导出（`Type`, `Static`, `TSchema`），通常不需要单独安装。仅在需要独立版本控制时单独安装。 |
| chalk | ^5.x | 终端颜色/样式 | pi-ai 依赖 chalk。用于自定义终端输出的样式和颜色。 |
| marked | ^15.x | Markdown 解析 | 用于将 LLM 输出的 Markdown 文本渲染为终端友好的格式。 |
| tsx | latest | TypeScript 执行器 | 运行 `.ts` 文件无需预编译。`npx tsx src/index.ts` 直接运行。 |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| tsgo (TypeScript Go) | TypeScript 编译器 | pi-mono 使用 `tsgo` 而非标准 `tsc`。但对于使用 pi-mono npm 包的项目，标准 `tsc` 或 `tsx` 即可。 |
| vitest | 测试框架 | pi-mono 使用 vitest。推荐用于 demo 的单元测试。 |
| tsconfig module: "ESNext" | 模块系统 | pi-ai 和 pi-agent-core 都是 ESM-only（`"type": "module"`，exports 仅提供 `"import"`）。项目 tsconfig 必须设置 `"module": "ESNext"` 和 `"moduleResolution": "bundler"`。 |
## Installation
# Core - pi-mono 包（版本锁定）
# TUI - 待选型
# Dev dependencies
## TypeScript 配置
- `"module": "ESNext"` -- pi-ai 和 pi-agent-core 都是 ESM-only，必须使用 ES 模块
- `"moduleResolution": "bundler"` -- pi-ai 使用 package.json `exports` 字段提供子路径导出（如 `@mariozechner/pi-ai/oauth`），bundler 模式能正确解析
- `"target": "ES2022"` -- Node 22 支持最新特性
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @mariozechner/pi-ai | Vercel AI SDK | 如果你需要 Next.js/React 集成、非工具调用场景、或更广泛的社区生态。pi-ai 作者明确选择不用 Vercel AI SDK，因为它在自托管模型工具调用上有问题，且抽象层面控制不够。 |

| @mariozechner/pi-agent-core | 直接用 pi-ai 的 agentLoop | 如果不需要状态管理、消息队列、传输抽象。pi-agent-core 的 `Agent` 类在 `agentLoop` 之上加了实用功能，对于最小 demo 可能有点重。 |

## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @mariozechner/pi-coding-agent | 这是完整的 coding agent CLI，不是库。项目目标是"用核心包构建最小 agent"，直接用 coding-agent 就失去了学习和验证意义。 | pi-ai + pi-agent-core |
| MCP (Model Context Protocol) | pi-mono 作者明确反对 MCP。MCP server 把所有工具描述 dump 到上下文中，浪费 7-9% 上下文窗口。 | 用 CLI 工具 + bash 的 progressive disclosure 方式 |
| CommonJS (`require`) | pi-ai 和 pi-agent-core 都是 ESM-only，不支持 `require()` 导入。 | 使用 `"type": "module"` + ESM import |
| 旧版 pi-mono 包 (< 0.67) | 0.67 之前版本 API 变动大。0.70.x 是当前稳定线。 | 锁定 @0.70.6 |
| tsc 直接编译 pi-ai 子路径导入 | pi-ai 使用 package.json exports 映射子路径（如 `./anthropic`, `./oauth`），标准 tsc 可能无法正确解析。 | 使用 `tsx` 运行，或用 bundler 模式的 moduleResolution |
## Stack Patterns by Variant
- 使用 pi-ai 的 `stream`/`complete` + `agentLoop`（不引入 pi-agent-core 的 `Agent` 类）
- TUI 待选型
- 直接 `npx tsx src/index.ts` 运行，无需构建步骤
- 理由：减少抽象层，更容易理解各包的职责边界
- 引入 pi-agent-core 的 `Agent` 类
- 理由：当需要消息队列、附件处理、传输抽象时，Agent 类提供了比裸 agentLoop 更完整的封装
- 使用 pi-ai 的 `getModel` + `Context` 序列化
- 理由：pi-ai 原生支持跨 provider 上下文交接，thinking traces 自动转换
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| pi-ai@0.70.6 | pi-agent-core@0.70.6 | pi-agent-core 依赖 `^0.70.6`（同版本线） |
| pi-agent-core@0.70.6 | Node.js >= 20.0.0 | 引擎要求 |
| pi-ai@0.70.6 | Node.js >= 20.0.0 | 引擎要求（隐含，通过依赖链） |
| pi-ai@0.70.6 子路径导入 | TypeScript moduleResolution: "bundler" | pi-ai exports 提供 12 个子路径，需要 bundler 模式解析 |
## Key API Surface Reference
### pi-ai 核心导出
### pi-ai 子路径导出（按需）
### pi-agent-core 核心导出
## Sources
- npm registry (`npm view @mariozechner/pi-ai@0.70.6`) -- 版本、依赖、元数据验证 -- HIGH confidence
- [pi-mono GitHub README](https://github.com/badlogic/pi-mono) -- 包列表、项目结构 -- HIGH confidence
- [pi-ai README.md](https://github.com/badlogic/pi-mono/blob/main/packages/ai/README.md) -- 完整 API 文档、Quick Start、工具定义、provider 配置 -- HIGH confidence
- [Mario Zechner 博客: What I learned building an opinionated and minimal coding agent](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/) -- 设计哲学、包之间的关系、为什么不用 Vercel AI SDK / Ink / MCP -- HIGH confidence
- pi-agent-core: 无独立 README，通过 npm 元数据和 blog 文章推断 API -- MEDIUM confidence
- pi-tui: 原 `@mariozechner/pi-tui@0.70.6` 已 DEPRECATED，迁移至 `@earendil-works/pi-tui`。TUI 层需重新选型 -- TUI 待定
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
