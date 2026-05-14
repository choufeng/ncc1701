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
    async execute(
      _id: string,
      params: ShellParams,
    ): Promise<AgentToolResult<void>> {
      const result = await shellIO.exec(params.command, params.timeout ?? 30000)
      if (result.ok) {
        const output = result.value.stdout || result.value.stderr || "(无输出)"
        return { content: [{ type: "text", text: output }], details: undefined }
      }
      throw new Error(`命令执行失败: ${result.error.message}`)
    },
  }
}
