import { describe, it, expect } from "vitest"
import {
  buildMessages,
  appendMarkdown,
  validateToolCall,
  formatToolResult,
} from "../src/pipeline"
import { ok, err } from "../src/result"
import type { ChatMessage } from "../src/types"

describe("pipeline", () => {
  const emptyHistory: readonly ChatMessage[] = []

  describe("buildMessages", () => {
    it("creates user message from input", () => {
      const msgs = buildMessages(emptyHistory, "hello")
      expect(msgs).toHaveLength(1)
      expect(msgs[0]!.role).toBe("user")
      if (msgs[0]!.role === "user") expect(msgs[0]!.content).toBe("hello")
    })

    it("prepends history", () => {
      const history: readonly ChatMessage[] = [
        { role: "user", content: "hi", ts: "t1" },
        { role: "assistant", content: "hey", ts: "t2" },
      ]
      const msgs = buildMessages(history, "next")
      expect(msgs).toHaveLength(3)
      expect(msgs[2]!.role).toBe("user")
    })
  })

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

    it("appends tool status", () => {
      const result = appendMarkdown("", "tool_call", "file-read")
      expect(result).toContain("🔧 工具")
      expect(result).toContain("file-read")
    })
  })

  describe("validateToolCall", () => {
    it("validates known tool", () => {
      const result = validateToolCall({ name: "file-read", args: { path: "x.ts" } })
      expect(result.ok).toBe(true)
    })

    it("rejects unknown tool", () => {
      const result = validateToolCall({ name: "dangerous" as any, args: {} })
      expect(result.ok).toBe(false)
    })

    it("validates file-read requires path", () => {
      const result = validateToolCall({ name: "file-read", args: {} })
      expect(result.ok).toBe(false)
    })
  })

  describe("formatToolResult", () => {
    it("formats ok result as text", () => {
      const text = formatToolResult(ok("file content here"))
      expect(text).toBe("file content here")
    })

    it("formats err result as error message", () => {
      const text = formatToolResult(err({ kind: "file", message: "not found", path: "/x" }))
      expect(text).toContain("not found")
    })
  })
})
