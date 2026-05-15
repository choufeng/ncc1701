import { spawn } from "node:child_process"
import { ok, err } from "../result"
import type { ShellError } from "../errors"
import type { ShellIO, ShellOutput } from "./interfaces"

const DEFAULT_TIMEOUT = 30_000 // 30s

// ⚠️ 副作用：进程执行
export function createShellIO(): ShellIO {
  return {
    exec(command: string, timeout = DEFAULT_TIMEOUT) {
      return new Promise((resolve) => {
        const child = spawn("sh", ["-c", command])

        let stdout = ""
        let stderr = ""

        child.stdout?.on("data", (data: Buffer) => { stdout += data.toString() })
        child.stderr?.on("data", (data: Buffer) => { stderr += data.toString() })

        let timedOut = false

        child.on("close", (code) => {
          clearTimeout(timer)
          if (timedOut) {
            resolve(err({
              kind: "shell" as const,
              message: `Command timed out after ${timeout}ms`,
              command,
              exitCode: code,
            }))
          } else if (code === 0) {
            resolve(ok({ stdout, stderr, exitCode: 0 }))
          } else {
            resolve(err({
              kind: "shell" as const,
              message: `Exit code: ${code}`,
              command,
              exitCode: code,
            }))
          }
        })

        const timer = setTimeout(() => {
          timedOut = true
          child.kill("SIGKILL")
        }, timeout)

        child.on("error", (e) => {
          clearTimeout(timer)
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
