/**
 * NCC-1701 Memory DB Manager
 *
 * SQLite 单文件存储，支持多项目、标签、共享知识。
 */

import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

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

export class MemoryDB {
  private db: Database | null = null;
  readonly dbPath: string;

  constructor() {
    const homeDir = os.homedir();
    this.dbPath = path.join(homeDir, ".pi", "agent", "ncc1701-memory.db");
  }

  open(): Database {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(SCHEMA_SQL);
    return this.db;
  }

  get(): Database {
    if (!this.db) return this.open();
    return this.db;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
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
