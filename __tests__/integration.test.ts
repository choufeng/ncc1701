import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { parseConfig } from "../src/config"
import { createFileIO } from "../src/io/file-io"
import { createShellIO } from "../src/io/shell-io"
import { createTavilyIO } from "../src/io/tavily-io"
import { createConversationIO } from "../src/io/conversation-io"
import { createTools } from "../src/tools/index"

let testDir: string

beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), "ncc1701-integ-"))
  mkdirSync(join(testDir, "sessions"), { recursive: true })
})

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true })
})

describe("integration: config → IO → tools", () => {
  it("assembles full tool chain from config", () => {
    const config = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_API_KEY: "sk-test",
      NCC_TAVILY_KEY: "tvly-test",
      NCC_ROOT_DIR: testDir,
    })
    expect(config.ok).toBe(true)
    if (!config.ok) return

    const fileIO = createFileIO(config.value.rootDir)
    const shellIO = createShellIO()
    const tavilyIO = createTavilyIO(config.value.tavilyApiKey)
    const tools = createTools({ fileIO, shellIO, tavilyIO })

    expect(tools).toHaveLength(4)
    expect(tools.map((t) => t.name).sort()).toEqual(["file-read", "file-write", "shell", "tavily-search"])
  })

  it("file-read tool reads a file through full chain", async () => {
    writeFileSync(join(testDir, "test.txt"), "hello integration")
    const config = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_API_KEY: "sk-test",
      NCC_TAVILY_KEY: "tvly-test",
      NCC_ROOT_DIR: testDir,
    })
    if (!config.ok) return

    const fileIO = createFileIO(config.value.rootDir)
    const tools = createTools({ fileIO, shellIO: createShellIO(), tavilyIO: createTavilyIO("k") })
    const fileRead = tools.find((t) => t.name === "file-read")!

    const result = await fileRead.execute("test-call", { path: "test.txt" })
    expect(result.content[0]!.type).toBe("text")
    if (result.content[0]!.type === "text") {
      expect(result.content[0]!.text).toBe("hello integration")
    }
  })

  it("file-write tool writes then file-read reads back", async () => {
    const config = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_API_KEY: "sk-test",
      NCC_TAVILY_KEY: "tvly-test",
      NCC_ROOT_DIR: testDir,
    })
    if (!config.ok) return

    const fileIO = createFileIO(config.value.rootDir)
    const tools = createTools({ fileIO, shellIO: createShellIO(), tavilyIO: createTavilyIO("k") })
    const fileWrite = tools.find((t) => t.name === "file-write")!
    const fileRead = tools.find((t) => t.name === "file-read")!

    await fileWrite.execute("write-call", { path: "roundtrip.txt", content: "round trip data" })
    const result = await fileRead.execute("read-call", { path: "roundtrip.txt" })

    expect(result.content[0]!.type).toBe("text")
    if (result.content[0]!.type === "text") {
      expect(result.content[0]!.text).toBe("round trip data")
    }
  })

  it("shell tool executes command", async () => {
    const config = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_API_KEY: "sk-test",
      NCC_TAVILY_KEY: "tvly-test",
      NCC_ROOT_DIR: testDir,
    })
    if (!config.ok) return

    const shellIO = createShellIO()
    const tools = createTools({ fileIO: createFileIO(testDir), shellIO, tavilyIO: createTavilyIO("k") })
    const shell = tools.find((t) => t.name === "shell")!

    const result = await shell.execute("shell-call", { command: "echo integration-test" })
    expect(result.content[0]!.type).toBe("text")
    if (result.content[0]!.type === "text") {
      expect(result.content[0]!.text.trim()).toBe("integration-test")
    }
  })
})

describe("integration: conversation lifecycle", () => {
  it("create → append → load → verify", async () => {
    const convIO = createConversationIO(testDir)
    const session = await convIO.createSession()
    expect(session.ok).toBe(true)
    if (!session.ok) return

    await convIO.appendMessage(session.value, { role: "user", content: "hello", ts: "t1" })
    await convIO.appendMessage(session.value, { role: "assistant", content: "world", ts: "t2" })
    await convIO.appendMessage(session.value, {
      role: "tool_call",
      name: "file-read",
      args: { path: "x.ts" },
      ts: "t3",
    })
    await convIO.appendMessage(session.value, {
      role: "tool_result",
      name: "file-read",
      result: "content",
      ts: "t4",
    })

    const loaded = await convIO.loadSession(session.value)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return

    expect(loaded.value).toHaveLength(4)
    expect(loaded.value[0]!.role).toBe("user")
    expect(loaded.value[1]!.role).toBe("assistant")
    expect(loaded.value[2]!.role).toBe("tool_call")
    expect(loaded.value[3]!.role).toBe("tool_result")
  })
})
