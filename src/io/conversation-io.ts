import { readFile, writeFile, appendFile, mkdir, readdir } from "node:fs/promises"
import { join } from "node:path"
import { ok, err } from "../result"
import type { SessionError } from "../errors"
import type { ChatMessage, SessionMeta } from "../types"
import type { ConversationIO } from "./interfaces"

// ⚠️ 副作用：文件系统读写
export function createConversationIO(baseDir: string): ConversationIO {
  const sessionsDir = join(baseDir, "sessions")

  async function ensureDir(): Promise<void> {
    await mkdir(sessionsDir, { recursive: true })
  }

  function sessionPath(id: string): string {
    return join(sessionsDir, `${id}.jsonl`)
  }

  return {
    async createSession() {
      try {
        await ensureDir()
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        await writeFile(sessionPath(id), "", "utf-8")
        return ok(id)
      } catch (e) {
        return err({ kind: "session" as const, message: (e as Error).message, sessionId: "new" })
      }
    },

    async appendMessage(sessionId: string, message: ChatMessage) {
      try {
        await appendFile(sessionPath(sessionId), JSON.stringify(message) + "\n", "utf-8")
        return ok(undefined)
      } catch (e) {
        return err({ kind: "session" as const, message: (e as Error).message, sessionId })
      }
    },

    async loadSession(id?: string) {
      try {
        await ensureDir()
        let targetId = id

        if (!targetId) {
          const files = await readdir(sessionsDir)
          const jsonlFiles = files.filter((f) => f.endsWith(".jsonl")).sort()
          if (jsonlFiles.length === 0) {
            return ok([])
          }
          targetId = jsonlFiles[jsonlFiles.length - 1]!.replace(".jsonl", "")
        }

        const content = await readFile(sessionPath(targetId), "utf-8")
        if (!content.trim()) return ok([])

        const messages: ChatMessage[] = content
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as ChatMessage)
        return ok(messages)
      } catch (e) {
        return err({ kind: "session" as const, message: (e as Error).message, sessionId: id ?? "latest" })
      }
    },

    async listSessions() {
      try {
        await ensureDir()
        const files = await readdir(sessionsDir)
        const jsonlFiles = files.filter((f) => f.endsWith(".jsonl")).sort()

        const metas: SessionMeta[] = await Promise.all(
          jsonlFiles.map(async (f) => {
            const id = f.replace(".jsonl", "")
            const content = await readFile(join(sessionsDir, f), "utf-8")
            const lines = content.trim() ? content.trim().split("\n") : []
            return {
              id,
              createdAt: new Date(parseInt(id)).toISOString(),
              messageCount: lines.length,
            }
          })
        )
        return ok(metas)
      } catch (e) {
        return err({ kind: "session" as const, message: (e as Error).message, sessionId: "list" })
      }
    },
  }
}
