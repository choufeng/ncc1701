import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createConversationIO } from "../../src/io/conversation-io"
import type { ChatMessage } from "../../src/types"

let testDir: string

beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), "ncc1701-conv-"))
})

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true })
})

describe("ConversationIO", () => {
  it("creates a session", async () => {
    const io = createConversationIO(testDir)
    const result = await io.createSession()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeTruthy()
  })

  it("appends and loads messages", async () => {
    const io = createConversationIO(testDir)
    const session = await io.createSession()
    if (!session.ok) throw new Error("setup failed")

    const msg: ChatMessage = { role: "user", content: "hello", ts: new Date().toISOString() }
    await io.appendMessage(session.value, msg)

    const loaded = await io.loadSession(session.value)
    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.value).toHaveLength(1)
      if (loaded.value[0]!.role === "user") expect(loaded.value[0]!.content).toBe("hello")
    }
  })

  it("loads latest session when no id given", async () => {
    const io = createConversationIO(testDir)
    const s1 = await io.createSession()
    if (!s1.ok) throw new Error("setup failed")
    await io.appendMessage(s1.value, { role: "user", content: "first", ts: "t1" })

    await new Promise((r) => setTimeout(r, 10))

    const s2 = await io.createSession()
    if (!s2.ok) throw new Error("setup failed")
    await io.appendMessage(s2.value, { role: "user", content: "second", ts: "t2" })

    const loaded = await io.loadSession()
    expect(loaded.ok).toBe(true)
    if (loaded.ok && loaded.value[0]!.role === "user") {
      expect(loaded.value[0]!.content).toBe("second")
    }
  })

  it("lists sessions", async () => {
    const io = createConversationIO(testDir)
    const result = await io.listSessions()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.length).toBeGreaterThanOrEqual(1)
  })

  it("returns error for nonexistent session", async () => {
    const io = createConversationIO(testDir)
    const result = await io.loadSession("nonexistent-id")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe("session")
  })
})
