import type { Result } from "../result"
import type { AppError, ShellError, NetworkError, SessionError } from "../errors"
import type { ChatMessage, SessionMeta } from "../types"

export interface ShellOutput {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
}

export interface TavilySearchResult {
  readonly title: string
  readonly url: string
  readonly content: string
}

export interface FileIO {
  readFile(path: string): Promise<Result<string, AppError>>
  writeFile(path: string, content: string): Promise<Result<void, AppError>>
}

export interface ShellIO {
  exec(command: string, timeout?: number): Promise<Result<ShellOutput, ShellError>>
}

export interface TavilyIO {
  search(query: string, maxResults?: number): Promise<Result<readonly TavilySearchResult[], NetworkError>>
}

export interface ConversationIO {
  createSession(): Promise<Result<string, SessionError>>
  appendMessage(sessionId: string, message: ChatMessage): Promise<Result<void, SessionError>>
  loadSession(id?: string): Promise<Result<readonly ChatMessage[], SessionError>>
  listSessions(): Promise<Result<readonly SessionMeta[], SessionError>>
}
