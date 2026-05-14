import { KNOWN_PROVIDERS, type AgentConfig, type Provider } from "./types"
import { type Result, err, ok } from "./result"
import type { ConfigError } from "./errors"

export function parseConfig(
  env: Record<string, string | undefined>
): Result<AgentConfig, ConfigError> {
  const provider = env.NCC_PROVIDER
  if (!provider) {
    return err({ kind: "config", message: "Missing NCC_PROVIDER", field: "NCC_PROVIDER" })
  }
  if (!(KNOWN_PROVIDERS as readonly string[]).includes(provider)) {
    return err({ kind: "config", message: `Unknown provider: ${provider}`, field: "NCC_PROVIDER" })
  }

  const model = env.NCC_MODEL
  if (!model) {
    return err({ kind: "config", message: "Missing NCC_MODEL", field: "NCC_MODEL" })
  }

  const apiKey = env.NCC_API_KEY
  if (!apiKey) {
    return err({ kind: "config", message: "Missing NCC_API_KEY", field: "NCC_API_KEY" })
  }

  const tavilyApiKey = env.NCC_TAVILY_KEY
  if (!tavilyApiKey) {
    return err({ kind: "config", message: "Missing NCC_TAVILY_KEY", field: "NCC_TAVILY_KEY" })
  }

  return ok({
    provider: provider as Provider,
    model,
    apiKey,
    tavilyApiKey,
    rootDir: env.NCC_ROOT_DIR ?? process.cwd(),
  })
}
