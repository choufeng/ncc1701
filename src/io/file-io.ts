import { readFile as fsReadFile, writeFile as fsWriteFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { ok, err } from "../result"
import type { FileIO } from "./interfaces"
import { isPathSafe } from "../types"

// ⚠️ 副作用：文件系统读写
export function createFileIO(rootDir: string): FileIO {
  return {
    async readFile(path: string) {
      if (!isPathSafe(path, rootDir)) {
        return err({ kind: "file" as const, message: `Unsafe path: ${path}`, path })
      }
      try {
        const content = await fsReadFile(resolve(rootDir, path), "utf-8")
        // 截断到 50KB
        const truncated = content.length > 51200
          ? content.slice(0, 51200) + "\n...[truncated]"
          : content
        return ok(truncated)
      } catch (e) {
        return err({ kind: "file" as const, message: (e as Error).message, path })
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
        return err({ kind: "file" as const, message: (e as Error).message, path })
      }
    },
  }
}
