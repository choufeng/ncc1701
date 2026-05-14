# Terminal Agent 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 pi-ai + pi-agent-core + @opentui/core 构建支持 4 工具、多轮持久化的终端 Agent。

**Architecture:** 纯函数域（类型、管道、验证）+ IO 边界层（文件/Shell/HTTP/持久化）+ UI 边界层（OpenTUI）。三层通过接口连接，index.ts 组装。

**Tech Stack:** TypeScript, Bun, @mariozechner/pi-ai@0.70.6, @mariozechner/pi-agent-core@0.70.6, @opentui/core@^0.2.10, vitest

---

## Task 1: Result 类型 + 测试

**Files:**
- Create: `src/result.ts`
- Create: `__tests__/result.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// __tests__/result.test.ts
import { describe, it, expect } from "vitest"
import { ok, err, map, flatMap, mapError, match } from "../src/result"

describe("result", () => {
  describe("ok", () => {
    it("should create ok result", () => {
      const r = ok(42)
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value).toBe(42)
    })
  })

  describe("err", () => {
    it("should create err result", () => {
      const r = err("failed")
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBe("failed")
    })
  })

  describe("map", () => {
    it("should transform ok value", () => {
      const r = map(ok(2), x => x * 3)
      expect(match(r, v => v, () => -1)).toBe(6)
    })

    it("should pass through err", () => {
      const r = map(err<string, string>("oops"), x => x.toUpperCase())
      expect(r.ok).toBe(false)
    })
  })

  describe("flatMap", () => {
    it("should chain ok results", () => {
      const r = flatMap(ok(5), x => ok(x + 1))
      expect(match(r, v => v, () => -1)).toBe(6)
    })

    it("should short-circuit on err", () => {
      const r = flatMap(err<string, string>("fail"), x => ok(x + 1))
      expect(r.ok).toBe(false)
    })

    it("should propagate inner err", () => {
      const r = flatMap(ok(5), () => err<string, number>(0))
      expect(r.ok).toBe(false)
    })
  })

  describe("mapError", () => {
    it("should transform err", () => {
      const r = mapError(err(404), e => `Error: ${e}`)
      expect(match(r, () => "ok", e => e)).toBe("Error: 404")
    })

    it("should pass through ok", () => {
      const r = mapError(ok(1), e => String(e))
      expect(match(r, v => v, () => -1)).toBe(1)
    })
  })

  describe("match", () => {
    it("should call onOk for ok", () => {
      expect(match(ok("hi"), v => v.toUpperCase(), e => e)).toBe("HI")
    })

    it("should call onErr for err", () => {
      expect(match(err("no"), v => v, e => e.toUpperCase())).toBe("NO")
    })
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bun test __tests__/result.test.ts`
Expected: FAIL — `../src/result` 不存在

- [ ] **Step 3: 写最小实现**

```typescript
// src/result.ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

export function map<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result
}

export function flatMap<T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return result.ok ? fn(result.value) : result
}

export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return result.ok ? result : err(fn(result.error))
}

export function match<T, E, R>(
  result: Result<T, E>,
  onOk: (value: T) => R,
  onErr: (error: E) => R
): R {
  return result.ok ? onOk(result.value) : onErr(result.error)
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bun test __tests__/result.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/result.ts __tests__/result.test.ts
git commit -m "feat: add Result<T,E> type with map/flatMap/match"
```

---

## Task 2: 错误类型 ADT + 测试

**Files:**
- Create: `src/errors.ts`
- Create: `__tests__/errors.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// __tests__/errors.test.ts
import { describe, it, expect } from "vitest"
import type { AppError } from "../src/errors"

describe("errors ADT", () => {
  it("ConfigError has kind 'config'", () => {
    const e: AppError = { kind: "config", message: "missing API key", field: "apiKey" }
    expect(e.kind).toBe("config")
    if (e.kind === "config") {
      expect(e.field).toBe("apiKey")
      expect(e.message).toBe("missing API key")
    }
  })

  it("FileError has kind 'file' with path", () => {
    const e: AppError = { kind: "file", message: "not found", path: "/tmp/x" }
    if (e.kind === "file") expect(e.path).toBe("/tmp/x")
  })

  it("ShellError has kind 'shell' with command", () => {
    const e: AppError = { kind: "shell", message: "timeout", command: "ls", exitCode: null }
    if (e.kind === "shell") expect(e.command).toBe("ls")
  })

  it("NetworkError has kind 'network' with url", () => {
    const e: AppError = { kind: "network", message: "timeout", url: "https://api.example.com", status: 503 }
    if (e.kind === "network") expect(e.status).toBe(503)
  })

  it("LLMError has kind 'llm' with provider", () => {
    const e: AppError = { kind: "llm", message: "rate limit", provider: "anthropic" }
    if (e.kind === "llm") expect(e.provider).toBe("anthropic")
  })

  it("SessionError has kind 'session' with sessionId", () => {
    const e: AppError = { kind: "session", message: "corrupt", sessionId: "abc" }
    if (e.kind === "session") expect(e.sessionId).toBe("abc")
  })

  it("exhaustive match compiles", () => {
    const handleError = (e: AppError): string => {
      switch (e.kind) {
        case "config": return `Config: ${e.field}`
        case "file": return `File: ${e.path}`
        case "shell": return `Shell: ${e.command}`
        case "network": return `Network: ${e.url}`
        case "llm": return `LLM: ${e.provider}`
        case "session": return `Session: ${e.sessionId}`
      }
    }
    expect(handleError({ kind: "config", message: "x", field: "y" })).toBe("Config: y")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bun test __tests__/errors.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```typescript
// src/errors.ts
export interface ConfigError {
  readonly kind: "config"
  readonly message: string
  readonly field: string
}

export interface FileError {
  readonly kind: "file"
  readonly message: string
  readonly path: string
  readonly cause?: AppError
}

export interface ShellError {
  readonly kind: "shell"
  readonly message: string
  readonly command: string
  readonly exitCode: number | null
}

export interface NetworkError {
  readonly kind: "network"
  readonly message: string
  readonly url: string
  readonly status?: number
}

export interface LLMError {
  readonly kind: "llm"
  readonly message: string
  readonly provider: string
}

export interface SessionError {
  readonly kind: "session"
  readonly message: string
  readonly sessionId: string
}

export type AppError = ConfigError | FileError | ShellError | NetworkError | LLMError | SessionError
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bun test __tests__/errors.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/errors.ts __tests__/errors.test.ts
git commit -m "feat: add AppError ADT with 6 error kinds"
```

---

## Task 3: 领域类型 (types.ts) + 测试

**Files:**
- Create: `src/types.ts`
- Create: `__tests__/types.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// __tests__/types.test.ts
import { describe, it, expect } from "vitest"
import { isPathSafe, validateToolName } from "../src/types"
import type { ChatMessage, ToolCall } from "../src/types"

describe("types", () => {
  describe("isPathSafe", () => {
    it("allows files under root", () => {
      expect(isPathSafe("./src/index.ts", "/project")).toBe(true)
    })

    it("blocks traversal above root", () => {
      expect(isPathSafe("../../etc/passwd", "/project")).toBe(false)
    })

    it("blocks absolute path outside root", () => {
      expect(isPathSafe("/etc/passwd", "/project")).toBe(false)
    })

    it("allows absolute path inside root", () => {
      expect(isPathSafe("/project/src/x.ts", "/project")).toBe(true)
    })
  })

  describe("validateToolName", () => {
    it("validates known tool names", () => {
      expect(validateToolName("file-read")).toBe(true)
      expect(validateToolName("file-write")).toBe(true)
      expect(validateToolName("shell")).toBe(true)
      expect(validateToolName("tavily-search")).toBe(true)
    })

    it("rejects unknown tool names", () => {
      expect(validateToolName("rm -rf")).toBe(false)
    })
  })

  describe("ChatMessage discriminated union", () => {
    it("user message has role 'user'", () => {
      const msg: ChatMessage = { role: "user", content: "hello", ts: "2026-01-01" }
      if (msg.role === "user") expect(msg.content).toBe("hello")
    })

    it("tool_call message has name and args", () => {
      const msg: ChatMessage = {
        role: "tool_call", name: "file-read",
        args: { path: "x.ts" }, ts: "2026-01-01"
      }
      if (msg.role === "tool_call") expect(msg.name).toBe("file-read")
    })
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bun test __tests__/types.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```typescript
// src/types.ts
import path from "node:path"

// === Provider ===
export const KNOWN_PROVIDERS = [
  "anthropic", "openai", "google", "google-gemini-cli", "google-vertex",
  "amazon-bedrock", "xai", "groq", "mistral", "deepseek", "openrouter",
  "azure-openai-responses", "openai-codex",
] as const

export type Provider = typeof KNOWN_PROVIDERS[number]

export interface AgentConfig {
  readonly provider: Provider
  readonly model: string
  readonly apiKey: string
  readonly tavilyApiKey: string
  readonly rootDir: string
}

// === ChatMessage ADT ===
export type ChatMessage =
  | { readonly role: "system"; readonly content: string; readonly ts: string }
  | { readonly role: "user"; readonly content: string; readonly ts: string }
  | { readonly role: "assistant"; readonly content: string; readonly ts: string }
  | { readonly role: "tool_call"; readonly name: string; readonly args: Readonly<Record<string, unknown>>; readonly ts: string }
  | { readonly role: "tool_result"; readonly name: string; readonly result: string; readonly ts: string }

// === ToolName ===
export const TOOL_NAMES = ["file-read", "file-write", "shell", "tavily-search"] as const
export type ToolName = typeof TOOL_NAMES[number]

export function validateToolName(name: string): boolean {
  return (TOOL_NAMES as readonly string[]).includes(name)
}

// === ToolCall ===
export interface ToolCall {
  readonly name: ToolName
  readonly args: Readonly<Record<string, unknown>>
}

// === Session ===
export interface SessionMeta {
  readonly id: string
  readonly createdAt: string
  readonly messageCount: number
}

// === 纯函数 ===
export function isPathSafe(requested: string, rootDir: string): boolean {
  const resolved = path.resolve(rootDir, requested)
  return resolved.startsWith(path.resolve(rootDir))
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bun test __tests__/types.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/types.ts __tests__/types.test.ts
git commit -m "feat: add domain types — Provider, ChatMessage ADT, ToolName, isPathSafe"
```

---

## Task 4: 配置解析纯函数 + 测试

**Files:**
- Create: `src/config.ts`
- Create: `__tests__/config.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// __tests__/config.test.ts
import { describe, it, expect } from "vitest"
import { parseConfig } from "../src/config"

describe("parseConfig", () => {
  it("parses valid config from env", () => {
    const result = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_API_KEY: "sk-test",
      NCC_TAVILY_KEY: "tvly-test",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.provider).toBe("anthropic")
      expect(result.value.model).toBe("claude-sonnet-4-20250514")
      expect(result.value.apiKey).toBe("sk-test")
    }
  })

  it("uses default rootDir as cwd", () => {
    const result = parseConfig({
      NCC_PROVIDER: "openai",
      NCC_MODEL: "gpt-4o",
      NCC_API_KEY: "sk-test",
      NCC_TAVILY_KEY: "tvly-test",
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.rootDir).toBe(process.cwd())
  })

  it("returns ConfigError for missing provider", () => {
    const result = parseConfig({ NCC_MODEL: "x", NCC_API_KEY: "k", NCC_TAVILY_KEY: "t" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe("config")
      expect(result.error.field).toBe("NCC_PROVIDER")
    }
  })

  it("returns ConfigError for unknown provider", () => {
    const result = parseConfig({
      NCC_PROVIDER: "fake-ai",
      NCC_MODEL: "x",
      NCC_API_KEY: "k",
      NCC_TAVILY_KEY: "t",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe("NCC_PROVIDER")
  })

  it("returns ConfigError for missing API key", () => {
    const result = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_TAVILY_KEY: "t",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe("NCC_API_KEY")
  })

  it("returns ConfigError for missing Tavily key", () => {
    const result = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_API_KEY: "k",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe("NCC_TAVILY_KEY")
  })

  it("respects NCC_ROOT_DIR override", () => {
    const result = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_API_KEY: "k",
      NCC_TAVILY_KEY: "t",
      NCC_ROOT_DIR: "/tmp/safe",
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.rootDir).toBe("/tmp/safe")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bun test __tests__/config.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```typescript
// src/config.ts
import { KNOWN_PROVIDERS, type AgentConfig, type Provider } from "./types"
import { type Result, err, ok } from "./result"
import type { ConfigError } from "./errors"

export function parseConfig(
  env: Record<string, string | undefined>
): Result<AgentConfig, ConfigError> {
  const provider = env.NCC_PROVIDER
  if (!provider) {
    return err({ kind: "config", message: "Missing NCC_PROVIDER", field: "NCC_PROVIDER" })
  }
  if (!(KNOWN_PROVIDERS as readonly string[]).includes(provider)) {
    return err({ kind: "config", message: `Unknown provider: ${provider}`, field: "NCC_PROVIDER" })
  }

  const model = env.NCC_MODEL
  if (!model) {
    return err({ kind: "config", message: "Missing NCC_MODEL", field: "NCC_MODEL" })
  }

  const apiKey = env.NCC_API_KEY
  if (!apiKey) {
    return err({ kind: "config", message: "Missing NCC_API_KEY", field: "NCC_API_KEY" })
  }

  const tavilyApiKey = env.NCC_TAVILY_KEY
  if (!tavilyApiKey) {
    return err({ kind: "config", message: "Missing NCC_TAVILY_KEY", field: "NCC_TAVILY_KEY" })
  }

  return ok({
    provider: provider as Provider,
    model,
    apiKey,
    tavilyApiKey,
    rootDir: env.NCC_ROOT_DIR ?? process.cwd(),
  })
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bun test __tests__/config.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/config.ts __tests__/config.test.ts
git commit -m "feat: add parseConfig pure function with validation"
```

---

## Task 5: 管道纯函数 + 测试

**Files:**
- Create: `src/pipeline.ts`
- Create: `__tests__/pipeline.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// __tests__/pipeline.test.ts
import { describe, it, expect } from "vitest"
import {
  buildMessages,
  appendMarkdown,
  validateToolCall,
  formatToolResult,
} from "../src/pipeline"
import { ok, err } from "../src/result"
import type { ChatMessage } from "../src/types"

describe("pipeline", () => {
  const emptyHistory: readonly ChatMessage[] = []

  describe("buildMessages", () => {
    it("creates user message from input", () => {
      const msgs = buildMessages(emptyHistory, "hello")
      expect(msgs).toHaveLength(1)
      expect(msgs[0]!.role).toBe("user")
      if (msgs[0]!.role === "user") expect(msgs[0]!.content).toBe("hello")
    })

    it("prepends history", () => {
      const history: readonly ChatMessage[] = [
        { role: "user", content: "hi", ts: "t1" },
        { role: "assistant", content: "hey", ts: "t2" },
      ]
      const msgs = buildMessages(history, "next")
      expect(msgs).toHaveLength(3)
      expect(msgs[2]!.role).toBe("user")
    })
  })

  describe("appendMarkdown", () => {
    it("appends user block", () => {
      const result = appendMarkdown("", "user", "hello")
      expect(result).toContain("## 用户")
      expect(result).toContain("hello")
    })

    it("appends assistant block", () => {
      const result = appendMarkdown("", "assistant", "world")
      expect(result).toContain("## 助手")
      expect(result).toContain("world")
    })

    it("appends tool status", () => {
      const result = appendMarkdown("", "tool_call", "file-read")
      expect(result).toContain("🔧 工具")
      expect(result).toContain("file-read")
    })
  })

  describe("validateToolCall", () => {
    it("validates known tool", () => {
      const result = validateToolCall({ name: "file-read", args: { path: "x.ts" } })
      expect(result.ok).toBe(true)
    })

    it("rejects unknown tool", () => {
      const result = validateToolCall({ name: "dangerous" as any, args: {} })
      expect(result.ok).toBe(false)
    })

    it("validates file-read requires path", () => {
      const result = validateToolCall({ name: "file-read", args: {} })
      expect(result.ok).toBe(false)
    })
  })

  describe("formatToolResult", () => {
    it("formats ok result as text", () => {
      const text = formatToolResult(ok("file content here"))
      expect(text).toBe("file content here")
    })

    it("formats err result as error message", () => {
      const text = formatToolResult(err({ kind: "file", message: "not found", path: "/x" }))
      expect(text).toContain("not found")
    })
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bun test __tests__/pipeline.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```typescript
// src/pipeline.ts
import { ok, err, match, type Result } from "./result"
import type { AppError } from "./errors"
import type { ChatMessage, ToolCall } from "./types"
import { validateToolName } from "./types"

export function buildMessages(
  history: readonly ChatMessage[],
  input: string
): readonly ChatMessage[] {
  const userMsg: ChatMessage = { role: "user", content: input, ts: new Date().toISOString() }
  return [...history, userMsg]
}

export function appendMarkdown(content: string, role: string, text: string): string {
  const blocks: Record<string, string> = {
    user: `\n## 用户\n${text}\n`,
    assistant: `\n## 助手\n${text}\n`,
    tool_call: `\n🔧 工具: ${text} → ⏳ 执行中\n`,
    tool_result: `\n🔧 工具: ${text} → ✅ 完成\n`,
  }
  return content + (blocks[role] ?? text)
}

export function validateToolCall(call: {
  name: string
  args: Record<string, unknown>
}): Result<ToolCall, AppError> {
  if (!validateToolName(call.name)) {
    return err({ kind: "config", message: `Unknown tool: ${call.name}`, field: "toolName" })
  }

  // file-read / file-write 需要 path
  if ((call.name === "file-read" || call.name === "file-write") && !call.args.path) {
    return err({ kind: "config", message: `Missing 'path' for ${call.name}`, field: "path" })
  }

  // shell 需要 command
  if (call.name === "shell" && !call.args.command) {
    return err({ kind: "config", message: "Missing 'command' for shell", field: "command" })
  }

  // tavily-search 需要 query
  if (call.name === "tavily-search" && !call.args.query) {
    return err({ kind: "config", message: "Missing 'query' for tavily-search", field: "query" })
  }

  return ok({ name: call.name as ToolCall["name"], args: call.args })
}

export function formatToolResult<T>(result: Result<T, AppError>): string {
  return match(
    result,
    (value) => String(value),
    (error) => `❌ 错误: ${error.message}`
  )
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bun test __tests__/pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/pipeline.ts __tests__/pipeline.test.ts
git commit -m "feat: add pipeline pure functions — buildMessages, appendMarkdown, validateToolCall"
```

---

## Task 6: IO 接口定义

**Files:**
- Create: `src/io/interfaces.ts`

- [ ] **Step 1: 写接口文件**

```typescript
// src/io/interfaces.ts
import type { Result } from "../result"
import type { AppError, ShellError, NetworkError, SessionError } from "../errors"
import type { ChatMessage, SessionMeta } from "../types"

export interface ShellOutput {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
}

export interface TavilySearchResult {
  readonly title: string
  readonly url: string
  readonly content: string
}

export interface FileIO {
  readFile(path: string): Promise<Result<string, AppError>>
  writeFile(path: string, content: string): Promise<Result<void, AppError>>
}

export interface ShellIO {
  exec(command: string, timeout?: number): Promise<Result<ShellOutput, ShellError>>
}

export interface TavilyIO {
  search(query: string, maxResults?: number): Promise<Result<readonly TavilySearchResult[], NetworkError>>
}

export interface ConversationIO {
  createSession(): Promise<Result<string, SessionError>>
  appendMessage(sessionId: string, message: ChatMessage): Promise<Result<void, SessionError>>
  loadSession(id?: string): Promise<Result<readonly ChatMessage[], SessionError>>
  listSessions(): Promise<Result<readonly SessionMeta[], SessionError>>
}
```

- [ ] **Step 2: 验证类型编译**

Run: `npx tsc --noEmit src/io/interfaces.ts` 或 `bun build src/io/interfaces.ts --no-bundle`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/io/interfaces.ts
git commit -m "feat: add IO interfaces — FileIO, ShellIO, TavilyIO, ConversationIO"
```

---

## Task 7: FileIO 实现 + 测试

**Files:**
- Create: `src/io/file-io.ts`
- Create: `__tests__/io/file-io.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// __tests__/io/file-io.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createFileIO } from "../src/io/file-io"

let testDir: string

beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), "ncc1701-test-"))
})

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true })
})

describe("FileIO", () => {
  it("reads existing file", async () => {
    writeFileSync(join(testDir, "hello.txt"), "hello world")
    const io = createFileIO(testDir)
    const result = await io.readFile("hello.txt")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe("hello world")
  })

  it("returns error for missing file", async () => {
    const io = createFileIO(testDir)
    const result = await io.readFile("nonexistent.txt")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe("file")
  })

  it("writes file successfully", async () => {
    const io = createFileIO(testDir)
    const result = await io.writeFile("output.txt", "written content")
    expect(result.ok).toBe(true)
  })

  it("reads back written file", async () => {
    const io = createFileIO(testDir)
    await io.writeFile("roundtrip.txt", "round trip")
    const result = await io.readFile("roundtrip.txt")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe("round trip")
  })

  it("blocks path traversal", async () => {
    const io = createFileIO(testDir)
    const result = await io.readFile("../../etc/passwd")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain("unsafe")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bun test __tests__/io/file-io.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```typescript
// src/io/file-io.ts
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import type { Result } from "../result"
import { ok, err } from "../result"
import type { FileError } from "../errors"
import type { FileIO } from "./interfaces"
import { isPathSafe } from "../types"

// ⚠️ 副作用：文件系统读写
export function createFileIO(rootDir: string): FileIO {
  return {
    async readFile(path: string): Promise<Result<string, FileError>> {
      if (!isPathSafe(path, rootDir)) {
        return err({ kind: "file", message: `Unsafe path: ${path}`, path })
      }
      try {
        const content = await readFile(resolve(rootDir, path), "utf-8")
        // 截断到 50KB
        return ok(content.length > 51200 ? content.slice(0, 51200) + "\n...[truncated]" : content)
      } catch (e) {
        return err({ kind: "file", message: (e as Error).message, path })
      }
    },

    async writeFile(path: string, content: string): Promise<Result<void, FileError>> {
      if (!isPathSafe(path, rootDir)) {
        return err({ kind: "file", message: `Unsafe path: ${path}`, path })
      }
      try {
        const full = resolve(rootDir, path)
        await mkdir(dirname(full), { recursive: true })
        await writeFile(full, content, "utf-8")
        return ok(undefined)
      } catch (e) {
        return err({ kind: "file", message: (e as Error).message, path })
      }
    },
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bun test __tests__/io/file-io.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/io/file-io.ts __tests__/io/file-io.test.ts
git commit -m "feat: add FileIO implementation with path safety"
```

---

## Task 8: ShellIO 实现 + 测试

**Files:**
- Create: `src/io/shell-io.ts`
- Create: `__tests__/io/shell-io.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// __tests__/io/shell-io.test.ts
import { describe, it, expect } from "vitest"
import { createShellIO } from "../src/io/shell-io"

describe("ShellIO", () => {
  it("executes command and returns stdout", async () => {
    const io = createShellIO()
    const result = await io.exec("echo hello")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.stdout.trim()).toBe("hello")
      expect(result.value.exitCode).toBe(0)
    }
  })

  it("captures stderr", async () => {
    const io = createShellIO()
    const result = await io.exec("echo error >&2")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.stderr.trim()).toBe("error")
  })

  it("returns error for non-zero exit", async () => {
    const io = createShellIO()
    const result = await io.exec("exit 1")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe("shell")
      expect(result.error.exitCode).toBe(1)
    }
  })

  it("times out long running command", async () => {
    const io = createShellIO()
    const result = await io.exec("sleep 10", 100)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain("timeout")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bun test __tests__/io/shell-io.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```typescript
// src/io/shell-io.ts
import { spawn } from "node:child_process"
import { ok, err, type Result } from "../result"
import type { ShellError } from "../errors"
import type { ShellIO } from "./interfaces"

// ⚠️ 副作用：进程执行
export function createShellIO(): ShellIO {
  return {
    exec(command: string, timeout = 30000): Promise<Result<import("./interfaces").ShellOutput, ShellError>> {
      return new Promise((resolve) => {
        const child = spawn("sh", ["-c", command], {
          timeout,
          killSignal: "SIGTERM",
        })

        let stdout = ""
        let stderr = ""

        child.stdout?.on("data", (data: Buffer) => { stdout += data.toString() })
        child.stderr?.on("data", (data: Buffer) => { stderr += data.toString() })

        child.on("close", (code) => {
          if (code === 0) {
            resolve(ok({ stdout, stderr, exitCode: 0 }))
          } else {
            resolve(err({
              kind: "shell",
              message: code === null ? "Process killed (timeout)" : `Exit code: ${code}`,
              command,
              exitCode: code,
            }))
          }
        })

        child.on("error", (e) => {
          resolve(err({
            kind: "shell",
            message: e.message,
            command,
            exitCode: null,
          }))
        })
      })
    },
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bun test __tests__/io/shell-io.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/io/shell-io.ts __tests__/io/shell-io.test.ts
git commit -m "feat: add ShellIO implementation with timeout"
```

---

## Task 9: TavilyIO 实现 + 测试

**Files:**
- Create: `src/io/tavily-io.ts`
- Create: `__tests__/io/tavily-io.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// __tests__/io/tavily-io.test.ts
import { describe, it, expect } from "vitest"
import { createTavilyIO } from "../src/io/tavily-io"

describe("TavilyIO", () => {
  it("returns error for invalid API key", async () => {
    const io = createTavilyIO("invalid-key")
    const result = await io.search("test query", 1)
    // 真实 API 会返回 401 或类似错误
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe("network")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bun test __tests__/io/tavily-io.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```typescript
// src/io/tavily-io.ts
import { ok, err, type Result } from "../result"
import type { NetworkError } from "../errors"
import type { TavilyIO, TavilySearchResult } from "./interfaces"

// ⚠️ 副作用：HTTP 请求
export function createTavilyIO(apiKey: string): TavilyIO {
  return {
    async search(
      query: string,
      maxResults = 5
    ): Promise<Result<readonly TavilySearchResult[], NetworkError>> {
      const url = "https://api.tavily.com/search"
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            max_results: maxResults,
            include_answer: false,
          }),
        })

        if (!response.ok) {
          return err({
            kind: "network",
            message: `Tavily API error: ${response.statusText}`,
            url,
            status: response.status,
          })
        }

        const data = await response.json() as { results: Array<{ title: string; url: string; content: string }> }
        const results: readonly TavilySearchResult[] = data.results.map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content,
        }))
        return ok(results)
      } catch (e) {
        return err({
          kind: "network",
          message: (e as Error).message,
          url,
        })
      }
    },
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bun test __tests__/io/tavily-io.test.ts`
Expected: PASS（测试用无效 key 会得到 network error）

- [ ] **Step 5: 提交**

```bash
git add src/io/tavily-io.ts __tests__/io/tavily-io.test.ts
git commit -m "feat: add TavilyIO implementation"
```

---

## Task 10: ConversationIO 实现 + 测试

**Files:**
- Create: `src/io/conversation-io.ts`
- Create: `__tests__/io/conversation-io.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// __tests__/io/conversation-io.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createConversationIO } from "../src/io/conversation-io"
import type { ChatMessage } from "../src/types"

let testDir: string

beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), "ncc1701-conv-"))
})

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true })
})

describe("ConversationIO", () => {
  it("creates a session", async () => {
    const io = createConversationIO(testDir)
    const result = await io.createSession()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeTruthy()
  })

  it("appends and loads messages", async () => {
    const io = createConversationIO(testDir)
    const session = await io.createSession()
    if (!session.ok) throw new Error("setup failed")

    const msg: ChatMessage = { role: "user", content: "hello", ts: new Date().toISOString() }
    await io.appendMessage(session.value, msg)

    const loaded = await io.loadSession(session.value)
    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.value).toHaveLength(1)
      if (loaded.value[0]!.role === "user") expect(loaded.value[0]!.content).toBe("hello")
    }
  })

  it("loads latest session when no id given", async () => {
    const io = createConversationIO(testDir)
    const s1 = await io.createSession()
    if (!s1.ok) throw new Error("setup failed")
    await io.appendMessage(s1.value, { role: "user", content: "first", ts: "t1" })

    // 等一下确保时间戳不同
    await new Promise((r) => setTimeout(r, 10))

    const s2 = await io.createSession()
    if (!s2.ok) throw new Error("setup failed")
    await io.appendMessage(s2.value, { role: "user", content: "second", ts: "t2" })

    const loaded = await io.loadSession()
    expect(loaded.ok).toBe(true)
    if (loaded.ok && loaded.value[0]!.role === "user") {
      expect(loaded.value[0]!.content).toBe("second")
    }
  })

  it("lists sessions", async () => {
    const io = createConversationIO(testDir)
    const result = await io.listSessions()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.length).toBeGreaterThanOrEqual(1)
  })

  it("returns error for nonexistent session", async () => {
    const io = createConversationIO(testDir)
    const result = await io.loadSession("nonexistent-id")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe("session")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bun test __tests__/io/conversation-io.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```typescript
// src/io/conversation-io.ts
import { readFile, writeFile, appendFile, mkdir, readdir } from "node:fs/promises"
import { join } from "node:path"
import { ok, err, type Result } from "../result"
import type { SessionError } from "../errors"
import type { ChatMessage, SessionMeta } from "../types"
import type { ConversationIO } from "./interfaces"

// ⚠️ 副作用：文件系统读写
export function createConversationIO(baseDir: string): ConversationIO {
  const sessionsDir = join(baseDir, "sessions")

  async function ensureDir(): Promise<void> {
    await mkdir(sessionsDir, { recursive: true })
  }

  function sessionPath(id: string): string {
    return join(sessionsDir, `${id}.jsonl`)
  }

  return {
    async createSession(): Promise<Result<string, SessionError>> {
      try {
        await ensureDir()
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        await writeFile(sessionPath(id), "", "utf-8")
        return ok(id)
      } catch (e) {
        return err({ kind: "session", message: (e as Error).message, sessionId: "new" })
      }
    },

    async appendMessage(
      sessionId: string,
      message: ChatMessage
    ): Promise<Result<void, SessionError>> {
      try {
        await appendFile(sessionPath(sessionId), JSON.stringify(message) + "\n", "utf-8")
        return ok(undefined)
      } catch (e) {
        return err({ kind: "session", message: (e as Error).message, sessionId })
      }
    },

    async loadSession(id?: string): Promise<Result<readonly ChatMessage[], SessionError>> {
      try {
        await ensureDir()
        let targetId = id

        if (!targetId) {
          const files = await readdir(sessionsDir)
          const jsonlFiles = files.filter((f) => f.endsWith(".jsonl")).sort()
          if (jsonlFiles.length === 0) {
            return ok([])
          }
          targetId = jsonlFiles[jsonlFiles.length - 1]!.replace(".jsonl", "")
        }

        const content = await readFile(sessionPath(targetId), "utf-8")
        if (!content.trim()) return ok([])

        const messages: ChatMessage[] = content
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as ChatMessage)
        return ok(messages)
      } catch (e) {
        return err({ kind: "session", message: (e as Error).message, sessionId: id ?? "latest" })
      }
    },

    async listSessions(): Promise<Result<readonly SessionMeta[], SessionError>> {
      try {
        await ensureDir()
        const files = await readdir(sessionsDir)
        const jsonlFiles = files.filter((f) => f.endsWith(".jsonl")).sort()

        const metas: SessionMeta[] = await Promise.all(
          jsonlFiles.map(async (f) => {
            const id = f.replace(".jsonl", "")
            const content = await readFile(join(sessionsDir, f), "utf-8")
            const lines = content.trim() ? content.trim().split("\n") : []
            return {
              id,
              createdAt: new Date(parseInt(id)).toISOString(),
              messageCount: lines.length,
            }
          })
        )
        return ok(metas)
      } catch (e) {
        return err({ kind: "session", message: (e as Error).message, sessionId: "list" })
      }
    },
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bun test __tests__/io/conversation-io.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/io/conversation-io.ts __tests__/io/conversation-io.test.ts
git commit -m "feat: add ConversationIO with JSONL persistence"
```

---

## Task 11: AgentTool 定义 + 工具注册

**Files:**
- Create: `src/tools/file-read.ts`
- Create: `src/tools/file-write.ts`
- Create: `src/tools/shell.ts`
- Create: `src/tools/tavily.ts`
- Create: `src/tools/index.ts`
- Create: `__tests__/tools/index.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// __tests__/tools/index.test.ts
import { describe, it, expect } from "vitest"
import { createTools } from "../src/tools/index"
import { createFileIO } from "../src/io/file-io"
import { createShellIO } from "../src/io/shell-io"
import { createTavilyIO } from "../src/io/tavily-io"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("createTools", () => {
  it("returns 4 AgentTools", () => {
    const tools = createTools({
      fileIO: createFileIO(tmpdir()),
      shellIO: createShellIO(),
      tavilyIO: createTavilyIO("test-key"),
      rootDir: tmpdir(),
    })
    expect(tools).toHaveLength(4)
    const names = tools.map((t) => t.name).sort()
    expect(names).toEqual(["file-read", "file-write", "shell", "tavily-search"])
  })

  it("each tool has name, description, parameters, execute", () => {
    const tools = createTools({
      fileIO: createFileIO(tmpdir()),
      shellIO: createShellIO(),
      tavilyIO: createTavilyIO("test-key"),
      rootDir: tmpdir(),
    })
    for (const tool of tools) {
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.parameters).toBeTruthy()
      expect(typeof tool.execute).toBe("function")
    }
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bun test __tests__/tools/index.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```typescript
// src/tools/file-read.ts
import { Type, type Static } from "@mariozechner/pi-ai"
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core"
import type { FileIO } from "../io/interfaces"

export const FileReadParams = Type.Object({
  path: Type.String({ description: "文件路径（相对于工作目录）" }),
})

export type FileReadParams = Static<typeof FileReadParams>

export function createFileReadTool(fileIO: FileIO): AgentTool<typeof FileReadParams, void> {
  return {
    name: "file-read",
    label: "读取文件",
    description: "读取指定路径的文件内容",
    parameters: FileReadParams,
    async execute(_id: string, params: FileReadParams): Promise<AgentToolResult<void>> {
      const result = await fileIO.readFile(params.path)
      if (result.ok) {
        return { content: [{ type: "text", text: result.value }] }
      }
      return {
        content: [{ type: "text", text: `❌ ${result.error.message}` }],
        isError: true,
      }
    },
  }
}
```

```typescript
// src/tools/file-write.ts
import { Type, type Static } from "@mariozechner/pi-ai"
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core"
import type { FileIO } from "../io/interfaces"

export const FileWriteParams = Type.Object({
  path: Type.String({ description: "文件路径" }),
  content: Type.String({ description: "写入内容" }),
})

export type FileWriteParams = Static<typeof FileWriteParams>

export function createFileWriteTool(fileIO: FileIO): AgentTool<typeof FileWriteParams, void> {
  return {
    name: "file-write",
    label: "写入文件",
    description: "将内容写入指定路径的文件",
    parameters: FileWriteParams,
    async execute(_id: string, params: FileWriteParams): Promise<AgentToolResult<void>> {
      const result = await fileIO.writeFile(params.path, params.content)
      if (result.ok) {
        return { content: [{ type: "text", text: `✅ 已写入 ${params.path}` }] }
      }
      return {
        content: [{ type: "text", text: `❌ ${result.error.message}` }],
        isError: true,
      }
    },
  }
}
```

```typescript
// src/tools/shell.ts
import { Type, type Static } from "@mariozechner/pi-ai"
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core"
import type { ShellIO } from "../io/interfaces"

export const ShellParams = Type.Object({
  command: Type.String({ description: "要执行的 shell 命令" }),
  timeout: Type.Optional(Type.Number({ description: "超时时间（毫秒），默认 30000" })),
})

export type ShellParams = Static<typeof ShellParams>

export function createShellTool(shellIO: ShellIO): AgentTool<typeof ShellParams, void> {
  return {
    name: "shell",
    label: "执行命令",
    description: "在 shell 中执行命令并返回输出",
    parameters: ShellParams,
    async execute(_id: string, params: ShellParams): Promise<AgentToolResult<void>> {
      const result = await shellIO.exec(params.command, params.timeout ?? 30000)
      if (result.ok) {
        const output = result.value.stdout || result.value.stderr || "(无输出)"
        return { content: [{ type: "text", text: output }] }
      }
      const output = result.value?.stdout ?? ""
      return {
        content: [{
          type: "text",
          text: `❌ ${result.error.message}\n${output}${result.value?.stderr ?? ""}`,
        }],
        isError: true,
      }
    },
  }
}
```

```typescript
// src/tools/tavily.ts
import { Type, type Static } from "@mariozechner/pi-ai"
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core"
import type { TavilyIO } from "../io/interfaces"

export const TavilySearchParams = Type.Object({
  query: Type.String({ description: "搜索关键词" }),
  maxResults: Type.Optional(Type.Number({ description: "最大结果数，默认 5" })),
})

export type TavilySearchParams = Static<typeof TavilySearchParams>

export function createTavilySearchTool(tavilyIO: TavilyIO): AgentTool<typeof TavilySearchParams, void> {
  return {
    name: "tavily-search",
    label: "网页搜索",
    description: "使用 Tavily 搜索网页",
    parameters: TavilySearchParams,
    async execute(_id: string, params: TavilySearchParams): Promise<AgentToolResult<void>> {
      const result = await tavilyIO.search(params.query, params.maxResults ?? 5)
      if (result.ok) {
        const text = result.value
          .map((r) => `### ${r.title}\n${r.url}\n${r.content}`)
          .join("\n\n")
        return { content: [{ type: "text", text: text || "无搜索结果" }] }
      }
      return {
        content: [{ type: "text", text: `❌ 搜索失败: ${result.error.message}` }],
        isError: true,
      }
    },
  }
}
```

```typescript
// src/tools/index.ts
import type { AgentTool } from "@mariozechner/pi-agent-core"
import type { FileIO, ShellIO, TavilyIO } from "../io/interfaces"
import { createFileReadTool } from "./file-read"
import { createFileWriteTool } from "./file-write"
import { createShellTool } from "./shell"
import { createTavilySearchTool } from "./tavily"

export interface ToolDeps {
  readonly fileIO: FileIO
  readonly shellIO: ShellIO
  readonly tavilyIO: TavilyIO
  readonly rootDir: string
}

export function createTools(deps: ToolDeps): AgentTool[] {
  return [
    createFileReadTool(deps.fileIO),
    createFileWriteTool(deps.fileIO),
    createShellTool(deps.shellIO),
    createTavilySearchTool(deps.tavilyIO),
  ]
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bun test __tests__/tools/index.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/tools/ __tests__/tools/
git commit -m "feat: add 4 AgentTools — file-read, file-write, shell, tavily-search"
```

---

## Task 12: OpenTUI 界面

**Files:**
- Create: `src/ui.ts`

- [ ] **Step 1: 写 UI 模块**

```typescript
// src/ui.ts
import {
  createCliRenderer,
  TextRenderable,
  BoxRenderable,
  InputRenderable,
  MarkdownRenderable,
  ScrollBoxRenderable,
  type CliRenderer,
} from "@opentui/core"

export interface UIHandle {
  readonly renderer: CliRenderer
  readonly input: InputRenderable
  readonly markdown: MarkdownRenderable
  readonly scrollBox: ScrollBoxRenderable
  readonly titleBar: TextRenderable
  appendMarkdown(role: string, text: string): void
  setStreaming(streaming: boolean): void
  updateTitle(info: string): void
}

// ⚠️ 副作用：终端 I/O
export async function createUI(): Promise<UIHandle> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    targetFps: 30,
  })

  // 标题栏
  const titleBar = new TextRenderable(renderer, {
    id: "title",
    content: "ncc1701 · initializing...",
  })

  // 可滚动区域
  const scrollBox = new ScrollBoxRenderable(renderer, {
    id: "scroll",
  })

  // Markdown 内容
  const markdown = new MarkdownRenderable(renderer, {
    id: "md",
    syntaxStyle: "dark",
    streaming: false,
  })

  scrollBox.add(markdown)

  // 输入框容器
  const inputBar = new BoxRenderable(renderer, {
    id: "input-bar",
    border: true,
    borderColor: "gray",
  })

  const input = new InputRenderable(renderer, {
    id: "input",
    placeholder: "输入消息...",
  })

  inputBar.add(input)

  // 布局
  renderer.root.flexDirection = "column"
  renderer.root.add(titleBar)
  renderer.root.add(scrollBox)
  renderer.root.add(inputBar)

  // 焦点到输入框
  renderer.focusRenderable(input)

  let currentContent = ""

  return {
    renderer,
    input,
    markdown,
    scrollBox,
    titleBar,
    appendMarkdown(role: string, text: string): void {
      const blocks: Record<string, string> = {
        user: `\n## 用户\n${text}\n`,
        assistant: `\n## 助手\n${text}`,
        tool_call: `\n🔧 ${text}\n`,
      }
      currentContent += blocks[role] ?? `\n${text}\n`
      markdown.content = currentContent
    },
    setStreaming(streaming: boolean): void {
      markdown.streaming = streaming
      if (!streaming) {
        // 定位到底部
        scrollBox.scrollToBottom()
      }
    },
    updateTitle(info: string): void {
      titleBar.content = `ncc1701 · ${info}`
    },
  }
}
```

- [ ] **Step 2: 验证编译**

Run: `bun build src/ui.ts --no-bundle 2>&1 | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/ui.ts
git commit -m "feat: add OpenTUI layout — title, scrollbox, markdown, input"
```

---

## Task 13: 入口 index.ts — 串联全部

**Files:**
- Create: `src/index.ts`
- Modify: `index.ts` → 改为引用 `src/index.ts`

- [ ] **Step 1: 写入口**

```typescript
// src/index.ts
import { parseArgs } from "node:util"
import { homedir } from "node:os"
import { join } from "node:path"
import { Agent } from "@mariozechner/pi-agent-core"
import { getModel, streamSimple } from "@mariozechner/pi-ai"
import { parseConfig } from "./config"
import { createFileIO } from "./io/file-io"
import { createShellIO } from "./io/shell-io"
import { createTavilyIO } from "./io/tavily-io"
import { createConversationIO } from "./io/conversation-io"
import { createTools } from "./tools/index"
import { createUI } from "./ui"
import { appendMarkdown } from "./pipeline"

const SYSTEM_PROMPT = "你是一个终端助手，可以读写文件、执行命令、搜索网页。用中文回复。"

// ⚠️ 副作用：程序入口
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      new: { type: "boolean", default: false },
      session: { type: "string" },
    },
    strict: true,
  })

  // 1. 配置
  const configResult = parseConfig(process.env as Record<string, string | undefined>)
  if (!configResult.ok) {
    console.error(`配置错误: ${configResult.error.message} (${configResult.error.field})`)
    process.exit(1)
  }
  const config = configResult.value

  // 2. IO 层
  const fileIO = createFileIO(config.rootDir)
  const shellIO = createShellIO()
  const tavilyIO = createTavilyIO(config.tavilyApiKey)
  const conversationIO = createConversationIO(join(homedir(), ".ncc1701"))

  // 3. 会话恢复
  let sessionId: string
  let history: readonly import("./types").ChatMessage[] = []

  if (values.new) {
    const s = await conversationIO.createSession()
    if (!s.ok) { console.error(`创建会话失败: ${s.error.message}`); process.exit(1) }
    sessionId = s.value
  } else if (values.session) {
    sessionId = values.session
    const loaded = await conversationIO.loadSession(sessionId)
    if (!loaded.ok) { console.error(`加载会话失败: ${loaded.error.message}`); process.exit(1) }
    history = loaded.value
  } else {
    const loaded = await conversationIO.loadSession()
    if (loaded.ok && loaded.value.length > 0) {
      // 找到对应的 session id
      const sessions = await conversationIO.listSessions()
      if (sessions.ok && sessions.value.length > 0) {
        sessionId = sessions.value[sessions.value.length - 1]!.id
        history = loaded.value
      } else {
        const s = await conversationIO.createSession()
        if (!s.ok) { process.exit(1) }
        sessionId = s.value
      }
    } else {
      const s = await conversationIO.createSession()
      if (!s.ok) { process.exit(1) }
      sessionId = s.value
    }
  }

  // 4. TUI
  const ui = await createUI()
  ui.updateTitle(`${config.provider}/${config.model} · session:${sessionId.slice(0, 8)}`)

  // 重放历史到 UI
  for (const msg of history) {
    if (msg.role === "user") ui.appendMarkdown("user", msg.content)
    else if (msg.role === "assistant") ui.appendMarkdown("assistant", msg.content)
    else if (msg.role === "tool_call") ui.appendMarkdown("tool_call", msg.name)
  }

  // 5. Agent
  const model = getModel(config.provider, config.model as any)
  const tools = createTools({ fileIO, shellIO, tavilyIO, rootDir: config.rootDir })

  const agent = new Agent({
    streamFn: streamSimple,
    getApiKey: () => config.apiKey,
  })

  agent.state.model = model
  agent.state.systemPrompt = SYSTEM_PROMPT
  agent.state.tools = tools

  // 6. 事件订阅
  agent.subscribe(async (event) => {
    switch (event.type) {
      case "agent_start":
        ui.setStreaming(true)
        break
      case "message_update": {
        if (event.assistantMessageEvent.type === "text_delta") {
          // 追加流式文本
          const delta = event.assistantMessageEvent.delta
          ui.appendMarkdown("assistant", delta)
        }
        if (event.assistantMessageEvent.type === "toolcall_end") {
          const tc = event.assistantMessageEvent.toolCall
          ui.appendMarkdown("tool_call", tc.name)
        }
        break
      }
      case "tool_execution_start":
        ui.appendMarkdown("tool_call", `${event.toolName} ⏳`)
        break
      case "tool_execution_end":
        ui.appendMarkdown("tool_result", `${event.toolName} ${event.isError ? "❌" : "✅"}`)
        break
      case "message_end": {
        // 保存到会话
        const msg = event.message
        if (msg.role === "assistant") {
          const text = msg.content
            .filter((c): c is import("@mariozechner/pi-ai").TextContent => c.type === "text")
            .map((c) => c.text)
            .join("")
          await conversationIO.appendMessage(sessionId, {
            role: "assistant",
            content: text,
            ts: new Date().toISOString(),
          })
        }
        break
      }
      case "agent_end":
        ui.setStreaming(false)
        break
    }
  })

  // 7. 输入绑定
  ui.input.on("submit", (value: string) => {
    const text = typeof value === "string" ? value : String(value)
    if (!text.trim()) return

    ui.appendMarkdown("user", text)
    conversationIO.appendMessage(sessionId, {
      role: "user",
      content: text,
      ts: new Date().toISOString(),
    })
    agent.prompt(text)
    // 清空输入
    ui.input.content = ""
  })

  // Ctrl+C 退出
  ui.renderer.keyInput.on("ctrl+c", () => {
    ui.renderer.destroy()
    process.exit(0)
  })

  // 恢复 agent 历史（如果有的话）
  // 注意：pi-agent-core Agent 使用自己的 Message 类型
  // 这里暂不做 LLM 级别的历史恢复，只恢复 UI 显示
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})
```

- [ ] **Step 2: 更新根 index.ts**

```typescript
// index.ts
export { } // 入口在 src/index.ts，通过 bun run src/index.ts 运行
```

- [ ] **Step 3: 验证编译**

Run: `bun build src/index.ts --no-bundle 2>&1 | head -20`
Expected: 无致命错误

- [ ] **Step 4: 提交**

```bash
git add src/index.ts index.ts
git commit -m "feat: wire up entry point — config, IO, tools, agent, TUI"
```

---

## Task 14: 添加 .env.example + vitest 配置

**Files:**
- Create: `.env.example`
- Modify: `package.json` — 添加 scripts

- [ ] **Step 1: 创建 .env.example**

```
NCC_PROVIDER=anthropic
NCC_MODEL=claude-sonnet-4-20250514
NCC_API_KEY=your-api-key-here
NCC_TAVILY_KEY=your-tavily-key-here
# NCC_ROOT_DIR=.
```

- [ ] **Step 2: 更新 package.json scripts**

在 `package.json` 添加：
```json
{
  "scripts": {
    "start": "bun run src/index.ts",
    "start:new": "bun run src/index.ts -- --new",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: 创建 vitest.config.ts（如需要）**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
  },
})
```

- [ ] **Step 4: 全量测试**

Run: `bun test`
Expected: 所有之前的测试通过

- [ ] **Step 5: 提交**

```bash
git add .env.example package.json vitest.config.ts
git commit -m "chore: add env template, scripts, vitest config"
```

---

## Task 15: 端到端手动验证

- [ ] **Step 1: 启动 Agent**

```bash
cp .env.example .env
# 编辑 .env 填入真实 API key
bun run src/index.ts --new
```

- [ ] **Step 2: 测试基本对话**

输入：`你好，请介绍一下你自己`
验证：流式 Markdown 输出到终端

- [ ] **Step 3: 测试文件读取工具**

输入：`帮我读一下 package.json`
验证：工具调用 → 文件内容显示

- [ ] **Step 4: 测试 Shell 工具**

输入：`运行 ls -la`
验证：命令执行 → 输出显示

- [ ] **Step 5: 测试会话恢复**

Ctrl+C 退出 → 重新启动（不带 `--new`）
验证：历史消息在 UI 中恢复

- [ ] **Step 6: 最终提交**

```bash
git add -A
git commit -m "chore: e2e verification pass"
```

---

## 自检清单

- [x] Spec 中每个章节都有对应 Task
- [x] 无 TBD / TODO / placeholder
- [x] 类型名在所有 Task 间一致（Result, AppError, ChatMessage, ToolCall, AgentConfig）
- [x] 每个函数签名在定义处和使用处匹配
- [x] 文件路径在所有 Task 间一致
- [x] 每个 Task 有测试（除 UI 和入口）
- [x] 铁律一（纯函数）：Task 1-5 全是纯函数
- [x] 铁律二（TDD）：每个 Task 先写测试再写实现
- [x] 铁律三（类型安全）：discriminated union、strict、显式返回类型
- [x] 铁律四（错误处理）：Result<T, E> 全链路、AppError ADT
