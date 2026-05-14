export interface ConfigError {
  readonly kind: "config"
  readonly message: string
  readonly field: string
}

export interface FileError {
  readonly kind: "file"
  readonly message: string
  readonly path: string
  readonly cause?: AppError
}

export interface ShellError {
  readonly kind: "shell"
  readonly message: string
  readonly command: string
  readonly exitCode: number | null
}

export interface NetworkError {
  readonly kind: "network"
  readonly message: string
  readonly url: string
  readonly status?: number
}

export interface LLMError {
  readonly kind: "llm"
  readonly message: string
  readonly provider: string
}

export interface SessionError {
  readonly kind: "session"
  readonly message: string
  readonly sessionId: string
}

export type AppError = ConfigError | FileError | ShellError | NetworkError | LLMError | SessionError

export const ERROR_KINDS = ["config", "file", "shell", "network", "llm", "session"] as const
