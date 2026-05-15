import { describe, it, expect } from "vitest"
import { isPathSafe, validateToolName } from "../src/types"
import type { ChatMessage, ToolCall } from "../src/types"

describe("types", () => {
  describe("isPathSafe", () => {
    it("allows files under root", () => {
      expect(isPathSafe("./src/index.ts", "/project")).toBe(true)
    })

    it("blocks traversal above root", () => {
      expect(isPathSafe("../../etc/passwd", "/project")).toBe(false)
    })

    it("blocks absolute path outside root", () => {
      expect(isPathSafe("/etc/passwd", "/project")).toBe(false)
    })

    it("allows absolute path inside root", () => {
      expect(isPathSafe("/project/src/x.ts", "/project")).toBe(true)
    })
  })

  describe("validateToolName", () => {
    it("validates known tool names", () => {
      expect(validateToolName("file-read")).toBe(true)
      expect(validateToolName("file-write")).toBe(true)
      expect(validateToolName("shell")).toBe(true)
      expect(validateToolName("tavily-search")).toBe(true)
    })

    it("rejects unknown tool names", () => {
      expect(validateToolName("rm -rf")).toBe(false)
    })
  })

  describe("ChatMessage discriminated union", () => {
    it("user message has role 'user'", () => {
      const msg: ChatMessage = { role: "user", content: "hello", ts: "2026-01-01" }
      if (msg.role === "user") expect(msg.content).toBe("hello")
    })

    it("tool_call message has name and args", () => {
      const msg: ChatMessage = {
        role: "tool_call", name: "file-read",
        args: { path: "x.ts" }, ts: "2026-01-01"
      }
      if (msg.role === "tool_call") expect(msg.name).toBe("file-read")
    })
  })
})
