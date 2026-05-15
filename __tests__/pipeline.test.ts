import { describe, it, expect } from "vitest"
import { appendMarkdown, appendStreamDelta } from "../src/pipeline"

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

describe("appendStreamDelta", () => {
  it("appends delta to existing assistant block", () => {
    const md = appendMarkdown("", "assistant", "hello")
    const result = appendStreamDelta(md, " world")
    expect(result).toContain("hello world")
    expect(result.match(/## 助手/g)).toHaveLength(1)
  })

  it("creates assistant block if none exists", () => {
    const result = appendStreamDelta("", "hello")
    expect(result).toContain("## 助手")
    expect(result).toContain("hello")
  })

  it("accumulates multiple deltas", () => {
    const md = appendMarkdown("", "assistant", "a")
    const md2 = appendStreamDelta(md, "b")
    const md3 = appendStreamDelta(md2, "c")
    expect(md3).toContain("abc")
    expect(md3.match(/## 助手/g)).toHaveLength(1)
  })

  it("appends delta after user block", () => {
    const md = appendMarkdown("", "user", "question")
    const result = appendStreamDelta(md, "answer")
    expect(result).toContain("## 用户")
    expect(result).toContain("## 助手")
    expect(result).toContain("answer")
    expect(result.match(/## 助手/g)).toHaveLength(1)
  })
})
