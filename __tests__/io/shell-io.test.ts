import { describe, it, expect } from "vitest"
import { createShellIO } from "../../src/io/shell-io"

describe("ShellIO", () => {
  it("executes command and returns stdout", async () => {
    const io = createShellIO()
    const result = await io.exec("echo hello")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.stdout.trim()).toBe("hello")
      expect(result.value.exitCode).toBe(0)
    }
  })

  it("captures stderr", async () => {
    const io = createShellIO()
    const result = await io.exec("echo error >&2")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.stderr.trim()).toBe("error")
  })

  it("returns error for non-zero exit", async () => {
    const io = createShellIO()
    const result = await io.exec("exit 1")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe("shell")
      expect(result.error.exitCode).toBe(1)
    }
  })

  it("times out long running command", async () => {
    const io = createShellIO()
    const result = await io.exec("sleep 10", 100)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain("timeout")
  })
})
