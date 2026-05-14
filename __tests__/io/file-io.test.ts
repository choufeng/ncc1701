import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createFileIO } from "../../src/io/file-io"

let testDir: string

beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), "ncc1701-test-"))
})

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true })
})

describe("FileIO", () => {
  it("reads existing file", async () => {
    writeFileSync(join(testDir, "hello.txt"), "hello world")
    const io = createFileIO(testDir)
    const result = await io.readFile("hello.txt")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe("hello world")
  })

  it("returns error for missing file", async () => {
    const io = createFileIO(testDir)
    const result = await io.readFile("nonexistent.txt")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe("file")
  })

  it("writes file successfully", async () => {
    const io = createFileIO(testDir)
    const result = await io.writeFile("output.txt", "written content")
    expect(result.ok).toBe(true)
  })

  it("reads back written file", async () => {
    const io = createFileIO(testDir)
    await io.writeFile("roundtrip.txt", "round trip")
    const result = await io.readFile("roundtrip.txt")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe("round trip")
  })

  it("blocks path traversal", async () => {
    const io = createFileIO(testDir)
    const result = await io.readFile("../../etc/passwd")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain("Unsafe")
  })
})
