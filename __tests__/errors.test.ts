import { describe, it, expect } from "vitest"
import { type AppError, ERROR_KINDS } from "../src/errors"

describe("errors ADT", () => {
  it("ConfigError has kind 'config'", () => {
    const e: AppError = { kind: "config", message: "missing API key", field: "apiKey" }
    expect(e.kind).toBe("config")
    if (e.kind === "config") {
      expect(e.field).toBe("apiKey")
      expect(e.message).toBe("missing API key")
    }
  })

  it("FileError has kind 'file' with path", () => {
    const e: AppError = { kind: "file", message: "not found", path: "/tmp/x" }
    if (e.kind === "file") expect(e.path).toBe("/tmp/x")
  })

  it("ShellError has kind 'shell' with command", () => {
    const e: AppError = { kind: "shell", message: "timeout", command: "ls", exitCode: null }
    if (e.kind === "shell") expect(e.command).toBe("ls")
  })

  it("NetworkError has kind 'network' with url", () => {
    const e: AppError = { kind: "network", message: "timeout", url: "https://api.example.com", status: 503 }
    if (e.kind === "network") expect(e.status).toBe(503)
  })

  it("LLMError has kind 'llm' with provider", () => {
    const e: AppError = { kind: "llm", message: "rate limit", provider: "anthropic" }
    if (e.kind === "llm") expect(e.provider).toBe("anthropic")
  })

  it("SessionError has kind 'session' with sessionId", () => {
    const e: AppError = { kind: "session", message: "corrupt", sessionId: "abc" }
    if (e.kind === "session") expect(e.sessionId).toBe("abc")
  })

  it("exports ERROR_KINDS array", () => {
    expect(ERROR_KINDS).toEqual(["config", "file", "shell", "network", "llm", "session"])
  })

  it("exhaustive match compiles", () => {
    const handleError = (e: AppError): string => {
      switch (e.kind) {
        case "config": return `Config: ${e.field}`
        case "file": return `File: ${e.path}`
        case "shell": return `Shell: ${e.command}`
        case "network": return `Network: ${e.url}`
        case "llm": return `LLM: ${e.provider}`
        case "session": return `Session: ${e.sessionId}`
      }
    }
    expect(handleError({ kind: "config", message: "x", field: "y" })).toBe("Config: y")
  })
})
