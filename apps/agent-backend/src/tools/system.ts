import { Tool } from "@pi-mono/core";

export const shellTool: Tool = {
  name: "shell",
  description: "Execute a shell command",
  async execute({ command }: { command: string }) {
    const proc = Bun.spawn(["sh", "-c", command]);
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    return {
      stdout,
      stderr,
      exitCode: proc.exitCode,
    };
  },
};

export const readFileTool: Tool = {
  name: "read_file",
  description: "Read a file from the filesystem",
  async execute({ path }: { path: string }) {
    const file = Bun.file(path);
    const exists = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${path}`);
    }
    const content = await file.text();
    return { content };
  },
};
