import { expect, test, describe } from "bun:test";
import { shellTool, readFileTool } from "../../src/tools/system";

describe("System Tools", () => {
  describe("shellTool", () => {
    test("should execute a simple command", async () => {
      const result = await shellTool.execute({ command: "echo 'hello'" });
      expect(result.stdout.trim()).toBe("hello");
      expect(result.exitCode).toBe(0);
    });

    test("should return error for invalid command", async () => {
      const result = await shellTool.execute({
        command: "non-existent-command",
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toBeDefined();
    });
  });

  describe("readFileTool", () => {
    test("should read an existing file", async () => {
      const testFilePath = "test-file.txt";
      await Bun.write(testFilePath, "file content");

      const result = await readFileTool.execute({ path: testFilePath });
      expect(result.content).toBe("file content");

      // cleanup
      const { unlink } = require("node:fs/promises");
      await unlink(testFilePath);
    });

    test("should return error for non-existent file", async () => {
      try {
        await readFileTool.execute({ path: "non-existent.txt" });
        expect(true).toBe(false); // should not reach here
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });
  });
});
