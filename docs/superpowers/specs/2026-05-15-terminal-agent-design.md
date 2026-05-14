# ncc1701 Terminal Agent — 设计规格

## 概述

pi-mono 生态（pi-ai + pi-agent-core）+ @opentui/core 终端 Agent demo。多 provider、4 工具、多轮持久化、流式 Markdown。

## 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| @mariozechner/pi-ai | 0.70.6 | 统一 LLM API |
| @mariozechner/pi-agent-core | 0.70.6 | Agent 运行时 |
| @opentui/core | ^0.2.10 | 终端 TUI |
| vitest | latest | 测试框架 |
| Bun | latest | 运行时 |

## 文件结构

```
src/
├── index.ts              # 入口：组装管道，启动 TUI
├── config.ts             # 纯函数：解析 env → AgentConfig
├── types.ts              # 全局 ADT 定义（Result、消息、错误、工具）
├── result.ts             # Result<T, E> 类型 + map/flatMap/match
├── errors.ts             # 错误类型层次
├── pipeline.ts           # 纯函数管道：输入 → 构建 messages → 调度
├── tools/
│   ├── index.ts          # 纯函数：工具 schema 定义 + 调度映射表
│   ├── file-read.ts      # 纯函数：参数验证 + schema
│   ├── file-write.ts     # 纯函数：参数验证 + schema
│   ├── shell.ts          # 纯函数：参数验证 + schema
│   └── tavily.ts         # 纯函数：参数验证 + schema
├── io/
│   ├── file-io.ts        # 副作用：文件读写实现
│   ├── shell-io.ts       # 副作用：Shell 执行
│   ├── tavily-io.ts      # 副作用：Tavily HTTP 调用
│   ├── conversation-io.ts # 副作用：JSONL 文件读写
│   └── interfaces.ts     # 副作用接口定义（依赖注入用）
└── ui.ts                 # 副作用：OpenTUI 布局 + 事件绑定
__tests__/
├── config.test.ts        # 配置解析纯函数测试
├── pipeline.test.ts      # 管道纯函数测试
├── tools/                # 工具参数验证测试
├── conversation.test.ts  # 持久化集成测试（临时目录）
└── io/                   # IO 层 mock 测试
```

**职责分离**：
- `src/` 根目录 = 纯函数 + 类型定义（可测试、无副作用）
- `src/io/` = 副作用边界层（文件、网络、进程）
- `src/ui.ts` = 副作用边界层（终端渲染）
- `__tests__/` = 测试，镜像 src 结构

## 核心类型 (types.ts)

```typescript
// === Provider ADT ===
type Provider = "anthropic" | "openai" | "google" | "xai" | "groq" | "mistral"

interface AgentConfig {
  readonly provider: Provider
  readonly model: string
  readonly apiKey: string
  readonly tavilyApiKey: string
  readonly rootDir: string  // 工具文件操作根目录
}

// === 消息 ADT（discriminated union） ===
type ChatMessage =
  | { readonly role: "system"; readonly content: string; readonly ts: string }
  | { readonly role: "user"; readonly content: string; readonly ts: string }
  | { readonly role: "assistant"; readonly content: string; readonly ts: string }
  | { readonly role: "tool_call"; readonly name: string; readonly args: Record<string, unknown>; readonly ts: string }
  | { readonly role: "tool_result"; readonly name: string; readonly result: string; readonly ts: string }

// === 工具返回统一用 Result ===
type ToolResult<T> = Result<T, ToolError>

// === 工具名 ADT ===
type ToolName = "file-read" | "file-write" | "shell" | "tavily-search"

// === 工具调度输入 ===
interface ToolCall {
  readonly name: ToolName
  readonly args: Readonly<Record<string, unknown>>
}
```

## Result 类型 (result.ts)

```typescript
// 自定义 Result<T, E>，零依赖
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

// 核心方法：map, flatMap, mapError, match
// 全部为纯函数，接收 Result 返回 Result
function ok<T>(value: T): Result<T, never>
function err<E>(error: E): Result<never, E>
function map<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>
function flatMap<T, E, U>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E>
function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>
function match<T, E, R>(result: Result<T, E>, onOk: (value: T) => R, onErr: (error: E) => R): R
```

## 错误类型层次 (errors.ts)

```typescript
// 项目级错误 ADT
type AppError =
  | ConfigError       // 配置缺失/无效
  | FileError         // 文件操作失败
  | ShellError        // Shell 执行失败
  | NetworkError      // HTTP 请求失败
  | LLMError          // LLM API 错误
  | SessionError      // 会话持久化错误

interface ConfigError {
  readonly kind: "config"
  readonly message: string
  readonly field: string
}

interface FileError {
  readonly kind: "file"
  readonly message: string
  readonly path: string
  readonly cause?: AppError
}

interface ShellError {
  readonly kind: "shell"
  readonly message: string
  readonly command: string
  readonly exitCode: number | null
}

interface NetworkError {
  readonly kind: "network"
  readonly message: string
  readonly url: string
  readonly status?: number
}

interface LLMError {
  readonly kind: "llm"
  readonly message: string
  readonly provider: string
}

interface SessionError {
  readonly kind: "session"
  readonly message: string
  readonly sessionId: string
}
```

## IO 接口 (io/interfaces.ts)

```typescript
// 副作用接口 — 依赖注入边界
interface FileIO {
  readFile(path: string): Promise<Result<string, FileError>>
  writeFile(path: string, content: string): Promise<Result<void, FileError>>
}

interface ShellIO {
  exec(command: string, timeout?: number): Promise<Result<ShellOutput, ShellError>>
}

interface ShellOutput {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
}

interface TavilyIO {
  search(query: string, maxResults?: number): Promise<Result<TavilyResult[], NetworkError>>
}

interface ConversationIO {
  createSession(): Promise<Result<SessionId, SessionError>>
  appendMessage(sessionId: SessionId, message: ChatMessage): Promise<Result<void, SessionError>>
  loadSession(id?: SessionId): Promise<Result<readonly ChatMessage[], SessionError>>
  listSessions(): Promise<Result<readonly SessionMeta[], SessionError>>
}
```

## 纯函数管道 (pipeline.ts)

```typescript
// 所有步骤为纯函数，无外部依赖

// 1. 验证工具调用参数
function validateToolCall(call: ToolCall): Result<ValidatedToolCall, AppError>

// 2. 构建消息上下文（历史 + 新输入）
function buildMessages(history: readonly ChatMessage[], input: string): readonly ChatMessage[]

// 3. 工具结果格式化
function formatToolResult<T>(result: Result<T, AppError>): string

// 4. Markdown 内容构建（追加到已有内容）
function appendMarkdown(content: string, role: string, text: string): string

// 5. 路径安全校验（纯函数，不碰文件系统）
function isPathSafe(requested: string, rootDir: string): boolean

// 管道组合
const handleToolCall = (call: ToolCall) =>
  pipe(
    validateToolCall(call),
    flatMap(dispatchToIO),  // dispatchToIO 在 io/ 层实现
    map(formatToolResult)
  )
```

## 数据流

```
用户输入 (Enter)
  → buildMessages(history, input)           // 纯函数
  → Agent.run(messages)                     // pi-agent-core
  → LLM 流式输出 → MarkdownRenderable       // streaming: true
  → 工具调用?
      → validateToolCall(call)              // 纯函数
      → io 层执行                           // 副作用
      → formatToolResult(result)            // 纯函数
      → 回传 LLM → 继续生成
  → 完成
      → appendMessage(session, msg)         // io 层
```

**纯函数 vs 副作用边界**：
- `pipeline.ts` + `tools/*.ts` + `types.ts` + `result.ts` + `errors.ts` = **纯函数域**，零外部依赖
- `io/*.ts` + `ui.ts` = **副作用边界层**，通过接口注入
- `index.ts` = **组装层**，将纯函数管道与 io 实现连接

## TUI 布局

```
renderer.root (flexDirection: column)
├── titleBar (TextRenderable, height: 1)
├── scrollArea (ScrollBoxRenderable, flexGrow: 1)
│   └── markdownContent (MarkdownRenderable, streaming: true)
└── inputBar (BoxRenderable, height: 3)
    └── input (InputRenderable)
```

- Enter 提交（单行）
- 新内容自动 scrollToBottom
- 焦点常驻 InputRenderable

## 配置 (config.ts)

纯函数，从 `Record<string, string | undefined>`（即 env）解析为 `Result<AgentConfig, ConfigError>`。

```typescript
function parseConfig(env: Record<string, string | undefined>): Result<AgentConfig, ConfigError>
```

环境变量：
```
NCC_PROVIDER=anthropic
NCC_MODEL=claude-sonnet-4
NCC_API_KEY=sk-xxx
NCC_TAVILY_KEY=tvly-xxx
NCC_ROOT_DIR=.    // 默认当前目录
```

## 工具定义

每个工具文件导出：
1. **TypeBox schema**（pi-ai 兼容）
2. **纯函数验证器**（参数校验，如路径安全检查）
3. **IO 接口调用**（通过注入的 io 实例执行）

| 工具 | 参数 | IO 方法 | 安全限制 |
|------|------|---------|----------|
| file-read | `{ path: string }` | `fileIO.readFile()` | `isPathSafe(path, rootDir)` 检查 |
| file-write | `{ path: string, content: string }` | `fileIO.writeFile()` | 同上 |
| shell | `{ command: string, timeout?: number }` | `shellIO.exec()` | 超时默认 30s |
| tavily-search | `{ query: string, maxResults?: number }` | `tavilyIO.search()` | — |

**systemPrompt**：你是一个终端助手，可以读写文件、执行命令、搜索网页。用中文回复。

## 对话持久化

存储路径：`~/.ncc1701/sessions/`。格式：JSONL。

通过 `ConversationIO` 接口实现。`io/conversation-io.ts` 为具体实现（读写文件系统）。

**恢复逻辑**：
1. `--new` → 创建新 session
2. `--session <id>` → 加载指定 session
3. 无参数 → 加载最新 session，无历史则新建

## Agent 初始化

```typescript
// index.ts 组装层（副作用边界）
const configResult = parseConfig(process.env)
if (!configResult.ok) { /* 处理配置错误 */ }
const config = configResult.value

const model = getModel(config.provider, config.model, { apiKey: config.apiKey })
// 通过接口注入 io 实现
const agent = createAgent({ model, tools, systemPrompt, io: { fileIO, shellIO, tavilyIO } })
```

构造不触发副作用。`getModel` 是纯对象创建，实际 API 调用在 `agent.run()` 时发生。

## 测试策略

### 纯函数测试（无 mock）

| 模块 | 测试内容 |
|------|----------|
| `result.test.ts` | map/flatMap/mapError/match 所有分支 |
| `config.test.ts` | 各种 env 组合 → Result 正确性 |
| `pipeline.test.ts` | validateToolCall、buildMessages、formatToolResult、isPathSafe |
| `tools/*.test.ts` | 参数验证逻辑 |
| `errors.test.ts` | 错误构造 |

### 副作用测试（mock 接口）

| 模块 | mock 目标 | 测试内容 |
|------|----------|----------|
| `io/file-io.test.ts` | Bun.file API | 读写成功/权限错误/路径不存在 |
| `io/shell-io.test.ts` | Bun.spawn | 执行成功/超时/非零退出 |
| `io/tavily-io.test.ts` | fetch | 搜索成功/API 错误/超时 |
| `io/conversation-io.test.ts` | 文件系统（临时目录） | JSONL 追加/加载/空 session |

### 集成测试

| 场景 | 范围 |
|------|------|
| 端到端对话流 | mock LLM → 验证工具调度 → 验证持久化 |
| 多 provider 配置 | 不同 env → 正确的 model 创建 |

### 覆盖率目标

核心纯函数（pipeline、result、tools 验证）：≥ 90%
IO 层：≥ 70%

## 不做的事（YAGNI）

- 多行输入（先单行跑通）
- Session 管理 UI
- 对话历史压缩/摘要
- 工具调用审批确认
- 插件/扩展系统
- branded type（provider 类型简单，暂不需要）
