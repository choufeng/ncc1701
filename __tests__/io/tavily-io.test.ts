import { describe, it, expect } from "vitest"
import { createTavilyIO } from "../../src/io/tavily-io"

describe("TavilyIO", () => {
  it("returns error for invalid API key", async () => {
    const io = createTavilyIO("invalid-key")
    const result = await io.search("test query", 1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe("network")
  })
})
