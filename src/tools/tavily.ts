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
    async execute(
      _id: string,
      params: TavilySearchParams,
    ): Promise<AgentToolResult<void>> {
      const result = await tavilyIO.search(params.query, params.maxResults ?? 5)
      if (result.ok) {
        const text = result.value
          .map((r) => `### ${r.title}\n${r.url}\n${r.content}`)
          .join("\n\n")
        return {
          content: [{ type: "text", text: text || "无搜索结果" }],
          details: undefined,
        }
      }
      throw new Error(`搜索失败: ${result.error.message}`)
    },
  }
}
