/**
 * 项目 Memory Extension — 单元测试
 * 验证 DB schema、CRUD、FTS5、标签、跨项目查询
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ============================================================================
// Schema (从扩展中复制，保持同步)
// ============================================================================

const SCHEMA_SQL = `
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
// Helpers
// ============================================================================

function addEntry(
  db: Database,
  project: string,
  content: string,
  tags?: string[],
): number {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const result = db.run(
    "INSERT INTO project_entries (project, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
    [project, content, now, now],
  );
  const id = Number(result.lastInsertRowid);

  if (tags && tags.length > 0) {
    const addTag = db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
    const linkTag = db.prepare(
      "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
    );
    const getTag = db.prepare("SELECT id FROM tags WHERE name = ?");

    for (const tag of tags) {
      addTag.run(tag.trim());
      const row = getTag.get(tag.trim()) as { id: number };
      linkTag.run(id, row.id);
    }
  }

  return id;
}

// ============================================================================
// Tests
// ============================================================================

let db: Database;
let dbPath: string;

beforeAll(() => {
  dbPath = path.join(os.tmpdir(), `project-memory-test-${Date.now()}.db`);
  db = new Database(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
});

afterAll(() => {
  db.close();
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
});

// ── 1. Schema 正确创建 ──
describe("Schema", () => {
  it("应该创建所有表", () => {
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;

    const names = tables.map((t) => t.name);
    expect(names).toContain("project_entries");
    expect(names).toContain("project_entries_fts");
    expect(names).toContain("tags");
    expect(names).toContain("entry_tags");
    expect(names).toContain("shared_knowledge");
    expect(names).toContain("shared_knowledge_fts");
  });

  it("应该创建所有触发器", () => {
    const triggers = db
      .query("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name")
      .all() as Array<{ name: string }>;

    const names = triggers.map((t) => t.name);
    expect(names).toContain("project_entries_ai");
    expect(names).toContain("project_entries_ad");
    expect(names).toContain("project_entries_au");
    expect(names).toContain("shared_knowledge_ai");
    expect(names).toContain("shared_knowledge_ad");
    expect(names).toContain("shared_knowledge_au");
  });

  it("应该创建所有索引", () => {
    const indexes = db
      .query("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name")
      .all() as Array<{ name: string }>;

    const names = indexes.map((i) => i.name);
    expect(names).toContain("idx_project_entries_project");
    expect(names).toContain("idx_project_entries_created");
    expect(names).toContain("idx_shared_knowledge_domain");
  });
});

// ── 2. 基本 CRUD ──
describe("CRUD", () => {
  it("add: 应该添加项目条目", () => {
    const id = addEntry(db, "project-a", "A项目使用TypeScript strict模式");
    expect(id).toBeGreaterThan(0);

    const row = db
      .query("SELECT * FROM project_entries WHERE id = ?")
      .get(id) as { project: string; content: string };
    expect(row.project).toBe("project-a");
    expect(row.content).toBe("A项目使用TypeScript strict模式");
  });

  it("replace: 应该替换条目内容", () => {
    const id = addEntry(db, "project-a", "旧内容待替换");
    db.run("UPDATE project_entries SET content = ? WHERE id = ?", ["新内容已替换", id]);

    const row = db
      .query("SELECT content FROM project_entries WHERE id = ?")
      .get(id) as { content: string };
    expect(row.content).toBe("新内容已替换");
  });

  it("remove: 应该删除条目", () => {
    const id = addEntry(db, "project-a", "待删除条目");
    db.run("DELETE FROM project_entries WHERE id = ?", [id]);

    const row = db
      .query("SELECT id FROM project_entries WHERE id = ?")
      .get(id);
    expect(row).toBeNull();
  });

  it("应该按项目隔离", () => {
    addEntry(db, "project-a", "A的记忆1");
    addEntry(db, "project-a", "A的记忆2");
    addEntry(db, "project-b", "B的记忆1");

    const aCount = db
      .query("SELECT COUNT(*) as count FROM project_entries WHERE project = ?")
      .get("project-a") as { count: number };
    const bCount = db
      .query("SELECT COUNT(*) as count FROM project_entries WHERE project = ?")
      .get("project-b") as { count: number };

    expect(aCount.count).toBeGreaterThanOrEqual(2);
    expect(bCount.count).toBeGreaterThanOrEqual(1);
  });
});

// ── 3. FTS5 全文搜索 ──
describe("FTS5 Search", () => {
  beforeAll(() => {
    addEntry(db, "search-test", "TypeScript strict mode 必须开启");
    addEntry(db, "search-test", "Docker compose 配置多服务");
    addEntry(db, "search-test", "TypeScript 泛型的高级用法");
  });

  it("应该通过关键词搜索条目", () => {
    const rows = db
      .query(
        `SELECT pe.content FROM project_entries pe
         JOIN project_entries_fts fts ON pe.id = fts.rowid
         WHERE project_entries_fts MATCH 'TypeScript'
         ORDER BY rank`,
      )
      .all() as Array<{ content: string }>;

    expect(rows.length).toBeGreaterThanOrEqual(2);
    const contents = rows.map((r) => r.content);
    expect(contents.some((c) => c.includes("strict"))).toBe(true);
    expect(contents.some((c) => c.includes("泛型"))).toBe(true);
  });

  it("FTS5 更新应同步：replace 后立即可搜索", () => {
    const id = addEntry(db, "fts-update-test", "旧内容Docker相关");
    db.run("UPDATE project_entries SET content = ? WHERE id = ?", ["新内容Kubernetes相关", id]);

    const rows = db
      .query(
        `SELECT pe.content FROM project_entries pe
         JOIN project_entries_fts fts ON pe.id = fts.rowid
         WHERE project_entries_fts MATCH 'Kubernetes'`,
      )
      .all() as Array<{ content: string }>;

    expect(rows.some((r) => r.content.includes("Kubernetes"))).toBe(true);
  });

  it("FTS5 更新应同步：delete 后不可搜索", () => {
    const id = addEntry(db, "fts-delete-test", "唯一的Redis配置");
    db.run("DELETE FROM project_entries WHERE id = ?", [id]);

    const rows = db
      .query(
        `SELECT pe.content FROM project_entries pe
         JOIN project_entries_fts fts ON pe.id = fts.rowid
         WHERE project_entries_fts MATCH 'Redis'`,
      )
      .all();

    expect(rows.length).toBe(0);
  });
});

// ── 4. 标签系统 ──
describe("Tags", () => {
  it("应该添加标签并关联条目", () => {
    const id = addEntry(db, "tag-test", "JWT token 过期时间设为15分钟", ["auth", "security"]);

    const tags = db
      .query(
        `SELECT t.name FROM tags t
         JOIN entry_tags et ON t.id = et.tag_id
         WHERE et.entry_id = ?`,
      )
      .all(id) as Array<{ name: string }>;

    const tagNames = tags.map((t) => t.name);
    expect(tagNames).toContain("auth");
    expect(tagNames).toContain("security");
  });

  it("标签应去重", () => {
    addEntry(db, "tag-test", "OAuth2 流程配置", ["auth"]);
    addEntry(db, "tag-test", "API key 管理", ["auth"]);

    const rows = db
      .query("SELECT COUNT(*) as count FROM tags WHERE name = 'auth'")
      .get() as { count: number };
    expect(rows.count).toBe(1);
  });

  it("删除条目时应级联删除标签关联", () => {
    const id = addEntry(db, "cascade-test", "临时测试条目", ["temp-tag"]);
    const beforeCount = db
      .query("SELECT COUNT(*) as count FROM entry_tags WHERE entry_id = ?")
      .get(id) as { count: number };
    expect(beforeCount.count).toBe(1);

    db.run("DELETE FROM project_entries WHERE id = ?", [id]);
    const afterCount = db
      .query("SELECT COUNT(*) as count FROM entry_tags WHERE entry_id = ?")
      .get(id) as { count: number };
    expect(afterCount.count).toBe(0);
  });
});

// ── 5. 跨项目标签查询 ──
describe("Cross-project Tags", () => {
  beforeAll(() => {
    addEntry(db, "project-a", "A项目：JWT认证使用RS256算法", ["auth", "jwt"]);
    addEntry(db, "project-a", "A项目：PostgreSQL主从复制", ["database"]);
    addEntry(db, "project-b", "B项目：OAuth2 + JWT刷新令牌", ["auth", "oauth"]);
    addEntry(db, "project-c", "C项目：MongoDB索引优化", ["database", "performance"]);
  });

  it("应该按标签跨项目查询", () => {
    // A项目的标签 → 查其他项目同标签条目
    const rows = db
      .query(
        `SELECT DISTINCT pe.content, pe.project, GROUP_CONCAT(t.name, ', ') as tags
         FROM project_entries pe
         JOIN entry_tags et ON pe.id = et.entry_id
         JOIN tags t ON et.tag_id = t.id
         WHERE pe.project != 'project-a'
           AND t.name IN (
             SELECT DISTINCT t2.name
             FROM project_entries pe2
             JOIN entry_tags et2 ON pe2.id = et2.entry_id
             JOIN tags t2 ON et2.tag_id = t2.id
             WHERE pe2.project = 'project-a'
           )
         GROUP BY pe.id`,
      )
      .all() as Array<{ content: string; project: string; tags: string }>;

    // B项目有 auth 标签 → 应该出现
    expect(rows.some((r) => r.project === "project-b" && r.content.includes("JWT"))).toBe(true);
    // C项目有 database 标签 → 应该出现
    expect(rows.some((r) => r.project === "project-c" && r.content.includes("MongoDB"))).toBe(true);
  });
});

// ── 6. 共享知识层 ──
describe("Shared Knowledge", () => {
  it("应该添加共享知识", () => {
    const result = db.run(
      "INSERT INTO shared_knowledge (domain, content) VALUES (?, ?)",
      ["typescript", "TypeScript strict模式必须开启，noImplicitAny不能关"],
    );
    expect(Number(result.lastInsertRowid)).toBeGreaterThan(0);
  });

  it("promote: 应该从项目条目升级", () => {
    const id = addEntry(db, "promote-test", "这条经验值得通用化");
    const entry = db
      .query("SELECT content FROM project_entries WHERE id = ?")
      .get(id) as { content: string };
    expect(entry).not.toBeNull();

    db.run(
      "INSERT INTO shared_knowledge (content, source_entry_id) VALUES (?, ?)",
      [entry.content, id],
    );

    const sk = db
      .query("SELECT * FROM shared_knowledge WHERE source_entry_id = ?")
      .get(id) as { content: string; source_entry_id: number };
    expect(sk.content).toBe("这条经验值得通用化");
    expect(sk.source_entry_id).toBe(id);
  });

  it("应该按 domain 分类查询", () => {
    db.run(
      "INSERT INTO shared_knowledge (domain, content) VALUES (?, ?)",
      ["docker", "Docker compose 用 version: '3.8'"],
    );

    const rows = db
      .query("SELECT content FROM shared_knowledge WHERE domain = ?")
      .all("docker") as Array<{ content: string }>;

    expect(rows.length).toBe(1);
    expect(rows[0].content).toContain("Docker compose");
  });

  it("FTS5 共享知识搜索", () => {
    const rows = db
      .query(
        `SELECT sk.content FROM shared_knowledge sk
         JOIN shared_knowledge_fts fts ON sk.id = fts.rowid
         WHERE shared_knowledge_fts MATCH 'strict'`,
      )
      .all() as Array<{ content: string }>;

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.content.includes("strict模式"))).toBe(true);
  });
});

// ── 7. 边界条件 ──
describe("Edge Cases", () => {
  it("空内容条目不应崩溃", () => {
    expect(() => {
      db.run(
        "INSERT INTO project_entries (project, content) VALUES (?, ?)",
        ["edge-test", ""],
      );
    }).not.toThrow();
  });

  it("重复标签不报错", () => {
    const id = addEntry(db, "edge-test", "重复标签测试", ["dup", "dup"]);
    const tags = db
      .query(
        `SELECT t.name FROM tags t
         JOIN entry_tags et ON t.id = et.tag_id
         WHERE et.entry_id = ?`,
      )
      .all(id) as Array<{ name: string }>;

    // entry_tags 有 UNIQUE(id) 约束，INSERT OR IGNORE 会跳过重复
    const dupTags = tags.filter((t) => t.name === "dup");
    expect(dupTags.length).toBe(1);
  });

  it("不存在的项目搜索应返回空", () => {
    const rows = db
      .query("SELECT * FROM project_entries WHERE project = ?")
      .all("nonexistent-project");
    expect(rows.length).toBe(0);
  });

  it("特殊字符在 FTS 搜索中不应崩溃", () => {
    addEntry(db, "special-chars", "测试内容 with special chars: @#$%^&*()");

    const rows = db
      .query(
        `SELECT pe.content FROM project_entries pe
         JOIN project_entries_fts fts ON pe.id = fts.rowid
         WHERE project_entries_fts MATCH 'special'`,
      )
      .all() as Array<{ content: string }>;

    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});
