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
    async execute(
      _id: string,
      params: FileReadParams,
    ): Promise<AgentToolResult<void>> {
      const result = await fileIO.readFile(params.path)
      if (result.ok) {
        return { content: [{ type: "text", text: result.value }], details: undefined }
      }
      // AgentTool 规范：失败时 throw
      throw new Error(`文件读取失败: ${result.error.message}`)
    },
  }
}
