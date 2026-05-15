import { ok, err } from "../result"
import type { NetworkError } from "../errors"
import type { TavilyIO, TavilySearchResult } from "./interfaces"
import type { Result } from "../result"

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
          message: e instanceof Error ? e.message : String(e),
          url,
        })
      }
    },
  }
}
