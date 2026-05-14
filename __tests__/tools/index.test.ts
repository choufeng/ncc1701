import { describe, it, expect } from "vitest"
import { createTools } from "../../src/tools/index"
import { createFileIO } from "../../src/io/file-io"
import { createShellIO } from "../../src/io/shell-io"
import { createTavilyIO } from "../../src/io/tavily-io"
import { tmpdir } from "node:os"

describe("createTools", () => {
  const deps = {
    fileIO: createFileIO(tmpdir()),
    shellIO: createShellIO(),
    tavilyIO: createTavilyIO("test-key"),
    rootDir: tmpdir(),
  }

  it("returns 4 AgentTools", () => {
    const tools = createTools(deps)
    expect(tools).toHaveLength(4)
    const names = tools.map((t) => t.name).sort()
    expect(names).toEqual(["file-read", "file-write", "shell", "tavily-search"])
  })

  it("each tool has name, label, description, parameters, execute", () => {
    const tools = createTools(deps)
    for (const tool of tools) {
      expect(tool.name).toBeTruthy()
      expect(tool.label).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.parameters).toBeTruthy()
      expect(typeof tool.execute).toBe("function")
    }
  })
})
