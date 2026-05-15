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
    async execute(
      _id: string,
      params: FileWriteParams,
    ): Promise<AgentToolResult<void>> {
      const result = await fileIO.writeFile(params.path, params.content)
      if (result.ok) {
        return {
          content: [{ type: "text", text: `✅ 已写入 ${params.path}` }],
          details: undefined,
        }
      }
      throw new Error(`文件写入失败: ${result.error.message}`)
    },
  }
}
