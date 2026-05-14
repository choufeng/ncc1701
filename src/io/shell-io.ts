import { spawn } from "node:child_process"
import { ok, err } from "../result"
import type { ShellError } from "../errors"
import type { ShellIO, ShellOutput } from "./interfaces"

// ⚠️ 副作用：进程执行
export function createShellIO(): ShellIO {
  return {
    exec(command: string, timeout = 30000) {
      return new Promise((resolve) => {
        const child = spawn("sh", ["-c", command], {
          timeout,
          killSignal: "SIGTERM",
        })

        let stdout = ""
        let stderr = ""

        child.stdout?.on("data", (data: Buffer) => { stdout += data.toString() })
        child.stderr?.on("data", (data: Buffer) => { stderr += data.toString() })

        child.on("close", (code) => {
          if (code === 0) {
            resolve(ok({ stdout, stderr, exitCode: 0 }))
          } else {
            resolve(err({
              kind: "shell" as const,
              message: code === null ? "Process killed (timeout)" : `Exit code: ${code}`,
              command,
              exitCode: code,
            }))
          }
        })

        child.on("error", (e) => {
          resolve(err({
            kind: "shell" as const,
            message: e.message,
            command,
            exitCode: null,
          }))
        })
      })
    },
  }
}
