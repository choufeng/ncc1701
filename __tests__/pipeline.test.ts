import { describe, it, expect } from "vitest"
import { appendMarkdown } from "../src/pipeline"

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

  it("appends tool_call status", () => {
    const result = appendMarkdown("", "tool_call", "file-read")
    expect(result).toContain("🔧 工具")
    expect(result).toContain("file-read")
    expect(result).toContain("⏳")
  })

  it("appends tool_result status", () => {
    const result = appendMarkdown("", "tool_result", "file-read")
    expect(result).toContain("✅ 完成")
  })

  it("chains multiple blocks", () => {
    const md = appendMarkdown("", "user", "hi")
    const md2 = appendMarkdown(md, "assistant", "hey")
    expect(md2).toContain("## 用户")
    expect(md2).toContain("## 助手")
  })
})
