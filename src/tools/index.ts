import type { AgentTool } from "@mariozechner/pi-agent-core"
import type { FileIO, ShellIO, TavilyIO } from "../io/interfaces"
import { createFileReadTool } from "./file-read"
import { createFileWriteTool } from "./file-write"
import { createShellTool } from "./shell"
import { createTavilySearchTool } from "./tavily"

export interface ToolDeps {
  readonly fileIO: FileIO
  readonly shellIO: ShellIO
  readonly tavilyIO: TavilyIO
  readonly rootDir: string
}

export function createTools(deps: ToolDeps): AgentTool[] {
  return [
    createFileReadTool(deps.fileIO),
    createFileWriteTool(deps.fileIO),
    createShellTool(deps.shellIO),
    createTavilySearchTool(deps.tavilyIO),
  ]
}
