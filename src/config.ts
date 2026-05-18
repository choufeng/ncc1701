import { getModel } from "@mariozechner/pi-ai"
import type { Model } from "@mariozechner/pi-ai"
import type { Provider } from "./types"
import { KNOWN_PROVIDERS, validateProvider, type AgentConfig } from "./types"
import { type Result, err, ok } from "./result"
import type { ConfigError } from "./errors"

export function parseConfig(
  env: Record<string, string | undefined>,
  cwd?: string,
): Result<AgentConfig, ConfigError> {
  const providerRaw = env.NCC_PROVIDER
  if (!providerRaw) {
    return err({ kind: "config", message: "Missing NCC_PROVIDER", field: "NCC_PROVIDER" })
  }

  const providerResult = validateProvider(providerRaw)
  if (!providerResult) {
    return err({ kind: "config", message: `Unknown provider: ${providerRaw}`, field: "NCC_PROVIDER" })
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
    provider: providerResult,
    model,
    apiKey,
    tavilyApiKey,
    rootDir: env.NCC_ROOT_DIR ?? cwd ?? ".",
  })
}

/**
 * 类型安全适配层：将运行时验证过的 provider/model 传给 getModel。
 *
 * getModel 签名要求编译时字面量类型，但配置从环境变量动态读取。
 * 此函数集中处理第三方库的类型不匹配，避免 as 断言散布在业务代码。
 * provider 已通过 validateProvider 验证合法性。
 */
export function createModel(provider: Provider, modelId: string): Model<import("@mariozechner/pi-ai").Api> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getModel(provider as any, modelId as any)
}
