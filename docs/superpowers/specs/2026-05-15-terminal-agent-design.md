# ncc1701 Terminal Agent — 设计规格

## 概述

基于 pi-mono 生态（pi-ai + pi-agent-core）和 @opentui/core 构建的最小终端 Agent demo。支持多 LLM provider、4 个工具（文件读写、Shell、Tavily 搜索）、多轮对话持久化、流式 Markdown 输出。

## 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| @mariozechner/pi-ai | 0.70.6 | 统一 LLM API（getModel + stream/complete） |
| @mariozechner/pi-agent-core | 0.70.6 | Agent 运行时（状态管理、事件流） |
| @opentui/core | ^0.2.10 | 终端 TUI（Markdown 流式渲染、Input、ScrollBox） |
| Bun | latest | 运行时 |

## 文件结构

```
src/
├── index.ts          # 入口：解析 config，启动 TUI + Agent
├── config.ts         # provider/model 配置，从 env 读取
├── tools/
│   ├── index.ts      # 工具注册表，导出所有工具定义
│   ├── file-read.ts  # 文件读取工具
│   ├── file-write.ts # 文件写入工具
│   ├── shell.ts      # Shell 执行工具
│   └── tavily.ts     # Tavily 搜索工具
├── conversation.ts   # 对话持久化（JSONL 读写）
└── ui.ts             # OpenTUI 布局 + 事件绑定
```

## 数据流

```
用户输入 (InputRenderable, Enter 提交)
  → Agent.run(userMessage)
  → pi-ai agentLoop
  → LLM 流式输出 → MarkdownRenderable (streaming: true)
  → 工具调用 → 执行对应 tool → 结果回传 LLM → 继续生成
  → 完成后 append JSONL 到 session 文件
```

## TUI 布局

```
┌──────────────────────────────────────────┐
│ ncc1701 · claude-sonnet-4 · session:abc  │  ← TextRenderable, height: 1
├──────────────────────────────────────────┤
│                                          │
│  # 用户                                  │
│  帮我读一下 package.json                  │  ← ScrollBoxRenderable (flexGrow: 1)
│                                          │     内含 MarkdownRenderable
│  ## 助手                                  │     streaming: true
│  这是你的 package.json 内容：             │
│  ```json { ... } ```                     │
│                                          │
│  🔧 工具: file-read → ✅ 完成             │
│                                          │
├──────────────────────────────────────────┤
│ > 输入消息...                             │  ← InputRenderable (height: 3)
└──────────────────────────────────────────┘
```

**布局树**：
```
renderer.root (flexDirection: column)
├── titleBar (TextRenderable, height: 1)
├── scrollArea (ScrollBoxRenderable, flexGrow: 1)
│   └── markdownContent (MarkdownRenderable)
└── inputBar (BoxRenderable, height: 3)
    └── input (InputRenderable)
```

**交互**：
- Enter 提交消息（单行输入）
- 新内容时自动 scrollBox.scrollToBottom()
- 焦点始终在 InputRenderable

## 配置 (config.ts)

```typescript
interface AgentConfig {
  provider: string     // "anthropic" | "openai" | "google" | ...
  model: string        // "claude-sonnet-4" | "gpt-4o" | ...
  apiKey: string
  tavilyApiKey: string
}
```

**读取优先级**：环境变量 → `.env` 文件

**环境变量**：
```
NCC_PROVIDER=anthropic
NCC_MODEL=claude-sonnet-4
NCC_API_KEY=sk-xxx
NCC_TAVILY_KEY=tvly-xxx
```

## 工具定义

统一使用 pi-ai ToolDefinition + TypeBox schema。

| 工具 | 参数 | 返回 | 安全限制 |
|------|------|------|----------|
| file-read | `{ path: string }` | 文件内容（截断 50KB） | 限制在工作目录下 |
| file-write | `{ path: string, content: string }` | 成功/失败消息 | 限制在工作目录下 |
| shell | `{ command: string, timeout?: number }` | `{ stdout, stderr, exitCode }` | 超时默认 30s |
| tavily-search | `{ query: string, maxResults?: number }` | 搜索结果摘要 | — |

**systemPrompt**：你是一个终端助手，可以读写文件、执行命令、搜索网页。用中文回复。

## 对话持久化 (conversation.ts)

**存储路径**：`~/.ncc1701/sessions/`

**文件格式**：JSONL，每行一条消息

```jsonl
{"role":"system","content":"...","ts":"2026-05-15T10:00:00Z"}
{"role":"user","content":"帮我读 package.json","ts":"2026-05-15T10:00:05Z"}
{"role":"assistant","content":"...","ts":"2026-05-15T10:00:08Z"}
{"role":"tool_call","name":"file-read","args":{"path":"package.json"},"ts":"..."}
{"role":"tool_result","name":"file-read","result":"...","ts":"..."}
```

**核心操作**：
- `createSession()` → 生成 `{timestamp}-{random}.jsonl`，返回 session id
- `appendMessage(sessionId, message)` → 追加一行
- `loadSession(id?) → Message[]` → 无 id 时加载最新 session
- `listSessions()` → 列出所有 session

**恢复逻辑**：
1. `--new` → 创建新 session
2. `--session <id>` → 加载指定 session
3. 无参数 → 加载最新 session，无历史则新建

**简化决策**：
- 不做 session 管理 UI
- JSONL 而非 SQLite（零依赖）
- 不压缩历史（demo 阶段 token 窗口够用）

## Agent 初始化

```typescript
import { Agent } from "@mariozechner/pi-agent-core"
import { getModel } from "@mariozechner/pi-ai"

const model = getModel(config.provider, config.model, { apiKey: config.apiKey })
const agent = new Agent({ model, tools, systemPrompt })
```

## 错误处理

- LLM API 错误 → 显示错误消息到 Markdown 区域，不退出
- 工具执行错误 → 错误信息作为 tool_result 回传 LLM，让它自行处理
- 文件权限错误 → 返回用户友好的错误消息
- Shell 超时 → 返回超时提示 + 已有输出
- Tavily API 错误 → 返回搜索失败提示

## 不做的事（YAGNI）

- 多行输入（先单行跑通）
- Session 删除/重命名 UI
- 对话历史压缩/摘要
- 工具调用审批确认
- 多 session 切换 UI
- 插件/扩展系统
