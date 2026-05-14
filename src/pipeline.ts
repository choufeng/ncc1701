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
