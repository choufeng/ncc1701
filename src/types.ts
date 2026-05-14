import path from "node:path"

// === Provider ===
export const KNOWN_PROVIDERS = [
  "anthropic", "openai", "google", "google-gemini-cli", "google-vertex",
  "amazon-bedrock", "xai", "groq", "mistral", "deepseek", "openrouter",
  "azure-openai-responses", "openai-codex",
] as const

export type Provider = typeof KNOWN_PROVIDERS[number]

export interface AgentConfig {
  readonly provider: Provider
  readonly model: string
  readonly apiKey: string
  readonly tavilyApiKey: string
  readonly rootDir: string
}

// === ChatMessage ADT ===
export type ChatMessage =
  | { readonly role: "system"; readonly content: string; readonly ts: string }
  | { readonly role: "user"; readonly content: string; readonly ts: string }
  | { readonly role: "assistant"; readonly content: string; readonly ts: string }
  | { readonly role: "tool_call"; readonly name: string; readonly args: Readonly<Record<string, unknown>>; readonly ts: string }
  | { readonly role: "tool_result"; readonly name: string; readonly result: string; readonly ts: string }

// === ToolName ===
export const TOOL_NAMES = ["file-read", "file-write", "shell", "tavily-search"] as const
export type ToolName = typeof TOOL_NAMES[number]

export function validateToolName(name: string): boolean {
  return (TOOL_NAMES as readonly string[]).includes(name)
}

// === ToolCall ===
export interface ToolCall {
  readonly name: ToolName
  readonly args: Readonly<Record<string, unknown>>
}

// === Session ===
export interface SessionMeta {
  readonly id: string
  readonly createdAt: string
  readonly messageCount: number
}

// === 纯函数 ===
export function isPathSafe(requested: string, rootDir: string): boolean {
  const resolved = path.resolve(rootDir, requested)
  return resolved.startsWith(path.resolve(rootDir))
}
