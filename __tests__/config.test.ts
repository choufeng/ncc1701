import { describe, it, expect } from "vitest"
import { parseConfig } from "../src/config"

describe("parseConfig", () => {
  it("parses valid config from env", () => {
    const result = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_API_KEY: "sk-test",
      NCC_TAVILY_KEY: "tvly-test",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.provider).toBe("anthropic")
      expect(result.value.model).toBe("claude-sonnet-4-20250514")
      expect(result.value.apiKey).toBe("sk-test")
    }
  })

  it("uses default rootDir from cwd param", () => {
    const result = parseConfig({
      NCC_PROVIDER: "openai",
      NCC_MODEL: "gpt-4o",
      NCC_API_KEY: "sk-test",
      NCC_TAVILY_KEY: "tvly-test",
    }, "/custom/cwd")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.rootDir).toBe("/custom/cwd")
  })

  it("falls back to '.' when no cwd", () => {
    const result = parseConfig({
      NCC_PROVIDER: "openai",
      NCC_MODEL: "gpt-4o",
      NCC_API_KEY: "sk-test",
      NCC_TAVILY_KEY: "tvly-test",
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.rootDir).toBe(".")
  })

  it("returns ConfigError for missing provider", () => {
    const result = parseConfig({ NCC_MODEL: "x", NCC_API_KEY: "k", NCC_TAVILY_KEY: "t" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe("config")
      expect(result.error.field).toBe("NCC_PROVIDER")
    }
  })

  it("returns ConfigError for unknown provider", () => {
    const result = parseConfig({
      NCC_PROVIDER: "fake-ai",
      NCC_MODEL: "x",
      NCC_API_KEY: "k",
      NCC_TAVILY_KEY: "t",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe("NCC_PROVIDER")
  })

  it("returns ConfigError for missing API key", () => {
    const result = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_TAVILY_KEY: "t",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe("NCC_API_KEY")
  })

  it("returns ConfigError for missing Tavily key", () => {
    const result = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_API_KEY: "k",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe("NCC_TAVILY_KEY")
  })

  it("respects NCC_ROOT_DIR override", () => {
    const result = parseConfig({
      NCC_PROVIDER: "anthropic",
      NCC_MODEL: "claude-sonnet-4-20250514",
      NCC_API_KEY: "k",
      NCC_TAVILY_KEY: "t",
      NCC_ROOT_DIR: "/tmp/safe",
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.rootDir).toBe("/tmp/safe")
  })
})
