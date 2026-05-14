import { readFile as fsReadFile, writeFile as fsWriteFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { ok, err } from "../result"
import type { FileIO } from "./interfaces"
import { isPathSafe } from "../types"

// ⚠️ 副作用：文件系统读写

const MAX_FILE_SIZE = 51200 // 50KB

export function createFileIO(rootDir: string): FileIO {
  return {
    async readFile(path: string) {
      if (!isPathSafe(path, rootDir)) {
        return err({ kind: "file" as const, message: `Unsafe path: ${path}`, path })
      }
      try {
        const content = await fsReadFile(resolve(rootDir, path), "utf-8")
        const truncated = content.length > MAX_FILE_SIZE
          ? content.slice(0, MAX_FILE_SIZE) + "\n...[truncated]"
          : content
        return ok(truncated)
      } catch (e) {
        return err({ kind: "file" as const, message: e instanceof Error ? e.message : String(e), path })
      }
    },

    async writeFile(path: string, content: string) {
      if (!isPathSafe(path, rootDir)) {
        return err({ kind: "file" as const, message: `Unsafe path: ${path}`, path })
      }
      try {
        const full = resolve(rootDir, path)
        await mkdir(dirname(full), { recursive: true })
        await fsWriteFile(full, content, "utf-8")
        return ok(undefined)
      } catch (e) {
        return err({ kind: "file" as const, message: e instanceof Error ? e.message : String(e), path })
      }
    },
  }
}
