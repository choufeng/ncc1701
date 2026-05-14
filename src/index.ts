// ⚠️ 副作用：程序入口
import { parseArgs } from "node:util"
import { homedir } from "node:os"
import { join } from "node:path"
import { Agent } from "@mariozechner/pi-agent-core"
import { getModel, streamSimple } from "@mariozechner/pi-ai"
import type { AssistantMessage, AssistantMessageEvent, TextContent } from "@mariozechner/pi-ai"
import { parseConfig } from "./config"
import { createFileIO } from "./io/file-io"
import { createShellIO } from "./io/shell-io"
import { createTavilyIO } from "./io/tavily-io"
import { createConversationIO } from "./io/conversation-io"
import { createTools } from "./tools/index"
import { createUI } from "./ui"
import type { ChatMessage } from "./types"

const SYSTEM_PROMPT = "你是一个终端助手，可以读写文件、执行命令、搜索网页。用中文回复。"

/** 从 AssistantMessage 提取文本 */
function extractText(message: AssistantMessage): string {
  return message.content
    .filter((c): c is TextContent => c.type === "text")
    .map((c) => c.text)
    .join("")
}

async function main(): Promise<void> {
  // 1. CLI 参数
  const { values } = parseArgs({
    options: {
      new: { type: "boolean", default: false },
      session: { type: "string" },
    },
    strict: true,
  })

  // 2. 配置
  const configResult = parseConfig(process.env as Record<string, string | undefined>)
  if (!configResult.ok) {
    console.error(`配置错误: ${configResult.error.message} (${configResult.error.field})`)
    process.exit(1)
  }
  const config = configResult.value

  // 3. IO 层
  const fileIO = createFileIO(config.rootDir)
  const shellIO = createShellIO()
  const tavilyIO = createTavilyIO(config.tavilyApiKey)
  const dataDir = join(homedir(), ".ncc1701")
  const conversationIO = createConversationIO(dataDir)

  // 4. 会话管理
  let sessionId: string
  let history: readonly ChatMessage[] = []

  if (values.session) {
    sessionId = values.session
    const loaded = await conversationIO.loadSession(sessionId)
    if (!loaded.ok) {
      console.error(`加载会话失败: ${loaded.error.message}`)
      process.exit(1)
    }
    history = loaded.value
  } else if (values.new) {
    const s = await conversationIO.createSession()
    if (!s.ok) {
      console.error(`创建会话失败: ${s.error.message}`)
      process.exit(1)
    }
    sessionId = s.value
  } else {
    const loaded = await conversationIO.loadSession()
    if (loaded.ok && loaded.value.length > 0) {
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

  // 5. TUI
  const ui = await createUI()
  ui.updateTitle(`${config.provider}/${config.model} · session:${sessionId.slice(0, 8)}`)

  // 重放历史到 UI
  for (const msg of history) {
    switch (msg.role) {
      case "user":
        ui.appendMarkdown("user", msg.content)
        break
      case "assistant":
        ui.appendMarkdown("assistant", msg.content)
        break
      case "tool_call":
        ui.appendMarkdown("tool_call", msg.name)
        break
      case "tool_result":
        ui.appendMarkdown("tool_result", `${msg.name} ✅`)
        break
    }
  }

  // 6. Agent
  // getModel 强类型，动态 provider 需要 as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = getModel(config.provider as any, config.model as any) as any
  const tools = createTools({ fileIO, shellIO, tavilyIO, rootDir: config.rootDir })

  const agent = new Agent({ streamFn: streamSimple })
  agent.state.model = model
  agent.state.systemPrompt = SYSTEM_PROMPT
  agent.state.tools = tools
  agent.getApiKey = () => config.apiKey

  // 7. 事件订阅
  agent.subscribe((event: any, _signal: AbortSignal): void => {
    switch (event.type) {
      case "agent_start":
        ui.setStreaming(true)
        break

      case "message_update": {
        const ame = event.assistantMessageEvent as AssistantMessageEvent
        if (ame.type === "text_delta") {
          ui.appendMarkdown("assistant", ame.delta)
        }
        if (ame.type === "toolcall_end") {
          ui.appendMarkdown("tool_call", ame.toolCall.name)
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
        const msg = event.message
        if (msg.role === "assistant") {
          const text = extractText(msg as AssistantMessage)
          conversationIO.appendMessage(sessionId, {
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

  // 8. 输入绑定
  ui.input.onSubmit = () => {
    const text = ui.input.editBuffer.getText().trim()
    if (!text) return

    ui.appendMarkdown("user", text)
    conversationIO.appendMessage(sessionId, {
      role: "user",
      content: text,
      ts: new Date().toISOString(),
    })
    agent.prompt(text)

    // 清空输入
    ui.input.setText("")
  }

  // Ctrl+C 退出
  process.on("SIGINT", () => {
    agent.abort()
    ui.renderer.destroy()
    process.exit(0)
  })
}

main().catch((e: unknown) => {
  console.error("Fatal:", e)
  process.exit(1)
})
