/**
 * 项目 Memory DB Manager
 *
 * SQLite 单文件存储，支持多项目、标签、共享知识。
 */

import { Database } from "bun:sqlite"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

// ⚠️ 副作用：SQLite 文件系统读写

// ============================================================================
// Schema
// ============================================================================

export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS project_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS project_entries_fts USING fts5(
    content, project,
    tokenize='trigram',
    content='project_entries',
    content_rowid='id'
  );

  CREATE TRIGGER IF NOT EXISTS project_entries_ai AFTER INSERT ON project_entries BEGIN
    INSERT INTO project_entries_fts(rowid, content, project) VALUES (new.id, new.content, new.project);
  END;

  CREATE TRIGGER IF NOT EXISTS project_entries_ad AFTER DELETE ON project_entries BEGIN
    INSERT INTO project_entries_fts(project_entries_fts, rowid, content, project) VALUES ('delete', old.id, old.content, old.project);
  END;

  CREATE TRIGGER IF NOT EXISTS project_entries_au AFTER UPDATE ON project_entries BEGIN
    INSERT INTO project_entries_fts(project_entries_fts, rowid, content, project) VALUES ('delete', old.id, old.content, old.project);
    INSERT INTO project_entries_fts(rowid, content, project) VALUES (new.id, new.content, new.project);
  END;

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id INTEGER NOT NULL REFERENCES project_entries(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS shared_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT,
    content TEXT NOT NULL,
    source_entry_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS shared_knowledge_fts USING fts5(
    content, domain,
    tokenize='trigram',
    content='shared_knowledge',
    content_rowid='id'
  );

  CREATE TRIGGER IF NOT EXISTS shared_knowledge_ai AFTER INSERT ON shared_knowledge BEGIN
    INSERT INTO shared_knowledge_fts(rowid, content, domain) VALUES (new.id, new.content, new.domain);
  END;

  CREATE TRIGGER IF NOT EXISTS shared_knowledge_ad AFTER DELETE ON shared_knowledge BEGIN
    INSERT INTO shared_knowledge_fts(shared_knowledge_fts, rowid, content, domain) VALUES ('delete', old.id, old.content, old.domain);
  END;

  CREATE TRIGGER IF NOT EXISTS shared_knowledge_au AFTER UPDATE ON shared_knowledge BEGIN
    INSERT INTO shared_knowledge_fts(shared_knowledge_fts, rowid, content, domain) VALUES ('delete', old.id, old.content, old.domain);
    INSERT INTO shared_knowledge_fts(rowid, content, domain) VALUES (new.id, new.content, new.domain);
  END;

  CREATE INDEX IF NOT EXISTS idx_project_entries_project ON project_entries(project);
  CREATE INDEX IF NOT EXISTS idx_project_entries_created ON project_entries(created_at);
  CREATE INDEX IF NOT EXISTS idx_shared_knowledge_domain ON shared_knowledge(domain);
`;

// ============================================================================
// Database Manager
// ============================================================================

// ⚠️ 副作用：打开数据库文件、执行 schema
export function openDB(dbPath?: string): Database {
  const resolvedPath = dbPath ?? defaultDBPath()
  const dir = path.dirname(resolvedPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const db = new Database(resolvedPath)
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA foreign_keys = ON")
  db.exec(SCHEMA_SQL)
  return db
}

/** 计算默认 dbPath — 纯函数 */
export function defaultDBPath(): string {
  return path.join(os.homedir(), ".pi", "agent", "project-memory.db")
}

/** 数据库管理器：封装 open/close 生命周期 */
export class MemoryDB {
  private db: Database | null = null
  readonly dbPath: string

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? defaultDBPath()
  }

  // ⚠️ 副作用：文件 I/O + SQLite 连接
  open(): Database {
    if (this.db) return this.db
    this.db = openDB(this.dbPath)
    return this.db
  }

  get(): Database {
    return this.db ?? this.open()
  }

  // ⚠️ 副作用：关闭数据库连接
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

export function detectProject(cwd?: string): string | null {
  const dir = cwd ?? process.cwd();
  const homeDir = os.homedir();
  const resolved = path.resolve(dir);
  const resolvedHome = path.resolve(homeDir);

  if (resolved === resolvedHome || resolved === "/" || resolved === resolvedHome + "/") {
    return null;
  }

  const name = path.basename(resolved);
  if (!name || name === "." || name === "..") return null;
  return name;
}

export function nowISO(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export function safeFtsQuery(query: string): string {
  return query.replace(/['"]/g, "").trim();
}
