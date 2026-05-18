/**
 * memory/prompt.ts 单元测试
 * 验证 buildProjectMemoryBlock 正确构建注入 prompt
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { Database } from "bun:sqlite"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { SCHEMA_SQL } from "../src/memory/db"
import { buildProjectMemoryBlock } from "../src/memory/prompt"
import type { MemoryDB } from "../src/memory/db"

let db: Database
let dbPath: string

function mockDB(database: Database): MemoryDB {
  return { get: () => database, dbPath: ":memory:", open: database, close: () => {} } as unknown as MemoryDB
}

beforeAll(() => {
  dbPath = path.join(os.tmpdir(), `prompt-test-${Date.now()}.db`)
  db = new Database(dbPath)
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA foreign_keys = ON")
  db.exec(SCHEMA_SQL)
})

afterAll(() => {
  db.close()
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
})

describe("buildProjectMemoryBlock", () => {
  it("returns empty string when no entries exist", () => {
    const result = buildProjectMemoryBlock(mockDB(db), "empty-project")
    expect(result).toBe("")
  })

  it("returns project memory context with entries", () => {
    db.run(
      "INSERT INTO project_entries (project, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
      ["test-project", "项目使用 TypeScript strict 模式", "2026-01-01 00:00:00", "2026-01-01 00:00:00"],
    )

    const result = buildProjectMemoryBlock(mockDB(db), "test-project")
    expect(result).toContain("<project-memory-context>")
    expect(result).toContain("TypeScript strict")
    expect(result).toContain("项目记忆: test-project")
    expect(result).toContain("</project-memory-context>")
  })

  it("respects maxProjectEntries config", () => {
    db.run("DELETE FROM project_entries WHERE project = 'limit-test'")
    for (let i = 0; i < 5; i++) {
      db.run(
        "INSERT INTO project_entries (project, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
        ["limit-test", `条目 ${i}`, "2026-01-01 00:00:00", "2026-01-01 00:00:00"],
      )
    }

    const result = buildProjectMemoryBlock(mockDB(db), "limit-test", { maxProjectEntries: 2, maxCrossProjectEntries: 0, maxSharedKnowledge: 0 })
    const matches = result.match(/§ 条目/g)
    expect(matches).toHaveLength(2)
  })

  it("includes shared knowledge", () => {
    db.run(
      "INSERT INTO shared_knowledge (domain, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
      ["general", "通用知识：使用 Result 类型", "2026-01-01 00:00:00", "2026-01-01 00:00:00"],
    )

    const result = buildProjectMemoryBlock(mockDB(db), "empty-project-2", { maxProjectEntries: 0, maxCrossProjectEntries: 0, maxSharedKnowledge: 5 })
    expect(result).toContain("<shared-knowledge-context>")
    expect(result).toContain("Result 类型")
  })

  it("includes cross-project entries by shared tags", () => {
    const rA = db.run(
      "INSERT INTO project_entries (project, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
      ["cross-a", "A 项目的 JWT 认证", "2026-01-01 00:00:00", "2026-01-01 00:00:00"],
    )
    const idA = Number(rA.lastInsertRowid)
    db.run("INSERT OR IGNORE INTO tags (name) VALUES (?)", ["auth"])
    const tagRow = db.query("SELECT id FROM tags WHERE name = ?").get("auth") as { id: number }
    db.run("INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)", [idA, tagRow.id])

    const rB = db.run(
      "INSERT INTO project_entries (project, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
      ["cross-b", "B 项目的 OAuth2 认证", "2026-01-01 00:00:00", "2026-01-01 00:00:00"],
    )
    const idB = Number(rB.lastInsertRowid)
    db.run("INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)", [idB, tagRow.id])

    const result = buildProjectMemoryBlock(mockDB(db), "cross-a", { maxProjectEntries: 5, maxCrossProjectEntries: 5, maxSharedKnowledge: 0 })
    expect(result).toContain("<cross-project-context>")
    expect(result).toContain("cross-b")
    expect(result).toContain("OAuth2")
  })
})
