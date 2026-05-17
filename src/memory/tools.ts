/**
 * 项目 Memory Tools
 *
 * 注册到 Agent 的工具函数，支持多项目记忆和共享知识。
 */

import type { MemoryDB } from "./db";
import { safeFtsQuery, nowISO } from "./db";

// ============================================================================
// Types
// ============================================================================

type ToolResult = string;

// ============================================================================
// project_memory
// ============================================================================

export interface ProjectMemoryParams {
  action: "add" | "replace" | "remove" | "search";
  project?: string;
  content?: string;
  old_text?: string;
  tags?: string[];
  limit?: number;
}

export async function projectMemory(
  db: MemoryDB,
  params: ProjectMemoryParams,
): Promise<ToolResult> {
  const sqlite = db.get();
  const { action, project, content, old_text, tags, limit = 10 } = params;

  switch (action) {
    case "add": {
      if (!project) return "❌ project 必填";
      if (!content?.trim()) return "❌ content 必填";

      const result = sqlite.run(
        "INSERT INTO project_entries (project, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [project, content.trim(), nowISO(), nowISO()],
      );

      const entryId = Number(result.lastInsertRowid);

      if (tags && tags.length > 0) {
        const addTag = sqlite.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
        const linkTag = sqlite.prepare(
          "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
        );
        const getTag = sqlite.prepare("SELECT id FROM tags WHERE name = ?");

        for (const tag of tags) {
          addTag.run(tag.trim());
          const row = getTag.get(tag.trim()) as { id: number };
          linkTag.run(entryId, row.id);
        }
      }

      const tagSuffix = tags?.length ? ` (标签: ${tags.join(", ")})` : "";
      return `✅ 已添加项目 ${project} 的记忆 (id=${entryId})${tagSuffix}`;
    }

    case "replace": {
      if (!old_text?.trim()) return "❌ old_text 必填";
      if (!content?.trim()) return "❌ content 必填";

      let rows: Array<{ id: number; content: string }>;
      if (project) {
        rows = sqlite
          .query("SELECT id, content FROM project_entries WHERE project = ? AND content LIKE ?")
          .all(project, `%${old_text}%`) as Array<{ id: number; content: string }>;
      } else {
        rows = sqlite
          .query("SELECT id, content FROM project_entries WHERE content LIKE ?")
          .all(`%${old_text}%`) as Array<{ id: number; content: string }>;
      }

      if (rows.length === 0) return `❌ 未找到匹配 "${old_text}" 的条目`;
      if (rows.length > 1) {
        const preview = rows.map((r) => `- [${r.id}] ${r.content.slice(0, 80)}...`).join("\n");
        return `❌ 找到 ${rows.length} 个匹配，请精确 old_text:\n${preview}`;
      }

      sqlite.run(
        "UPDATE project_entries SET content = ?, updated_at = ? WHERE id = ?",
        [content.trim(), nowISO(), rows[0].id],
      );

      return `✅ 已替换条目 (id=${rows[0].id})`;
    }

    case "remove": {
      if (!old_text?.trim()) return "❌ old_text 必填";

      let rows: Array<{ id: number; content: string }>;
      if (project) {
        rows = sqlite
          .query("SELECT id, content FROM project_entries WHERE project = ? AND content LIKE ?")
          .all(project, `%${old_text}%`) as Array<{ id: number; content: string }>;
      } else {
        rows = sqlite
          .query("SELECT id, content FROM project_entries WHERE content LIKE ?")
          .all(`%${old_text}%`) as Array<{ id: number; content: string }>;
      }

      if (rows.length === 0) return `❌ 未找到匹配 "${old_text}" 的条目`;
      if (rows.length > 1) {
        const preview = rows.map((r) => `- [${r.id}] ${r.content.slice(0, 80)}...`).join("\n");
        return `❌ 找到 ${rows.length} 个匹配，请精确 old_text:\n${preview}`;
      }

      sqlite.run("DELETE FROM project_entries WHERE id = ?", [rows[0].id]);
      return `✅ 已删除条目 (id=${rows[0].id})`;
    }

    case "search": {
      let rows: Array<{
        id: number;
        project: string;
        content: string;
        tags: string | null;
        created_at: string;
      }>;

      if (content?.trim()) {
        const safeQuery = safeFtsQuery(content);
        if (project) {
          rows = sqlite
            .query(
              `SELECT pe.id, pe.project, pe.content, GROUP_CONCAT(t.name, ', ') as tags, pe.created_at
               FROM project_entries pe
               JOIN project_entries_fts fts ON pe.id = fts.rowid
               LEFT JOIN entry_tags et ON pe.id = et.entry_id
               LEFT JOIN tags t ON et.tag_id = t.id
               WHERE project_entries_fts MATCH ?1 AND pe.project = ?2
               GROUP BY pe.id ORDER BY rank LIMIT ?3`,
            )
            .all(safeQuery, project, limit) as typeof rows;
        } else {
          rows = sqlite
            .query(
              `SELECT pe.id, pe.project, pe.content, GROUP_CONCAT(t.name, ', ') as tags, pe.created_at
               FROM project_entries pe
               JOIN project_entries_fts fts ON pe.id = fts.rowid
               LEFT JOIN entry_tags et ON pe.id = et.entry_id
               LEFT JOIN tags t ON et.tag_id = t.id
               WHERE project_entries_fts MATCH ?
               GROUP BY pe.id ORDER BY rank LIMIT ?`,
            )
            .all(safeQuery, limit) as typeof rows;
        }
      } else if (tags && tags.length > 0) {
        const placeholders = tags.map(() => "?").join(", ");
        if (project) {
          rows = sqlite
            .query(
              `SELECT pe.id, pe.project, pe.content, GROUP_CONCAT(t2.name, ', ') as tags, pe.created_at
               FROM project_entries pe
               JOIN entry_tags et ON pe.id = et.entry_id
               JOIN tags t ON et.tag_id = t.id
               LEFT JOIN entry_tags et2 ON pe.id = et2.entry_id
               LEFT JOIN tags t2 ON et2.tag_id = t2.id
               WHERE pe.project = ? AND t.name IN (${placeholders})
               GROUP BY pe.id ORDER BY pe.updated_at DESC LIMIT ?`,
            )
            .all(project, ...tags.map((t) => t.trim()), limit) as typeof rows;
        } else {
          rows = sqlite
            .query(
              `SELECT pe.id, pe.project, pe.content, GROUP_CONCAT(t2.name, ', ') as tags, pe.created_at
               FROM project_entries pe
               JOIN entry_tags et ON pe.id = et.entry_id
               JOIN tags t ON et.tag_id = t.id
               LEFT JOIN entry_tags et2 ON pe.id = et2.entry_id
               LEFT JOIN tags t2 ON et2.tag_id = t2.id
               WHERE t.name IN (${placeholders})
               GROUP BY pe.id ORDER BY pe.updated_at DESC LIMIT ?`,
            )
            .all(...tags.map((t) => t.trim()), limit) as typeof rows;
        }
      } else {
        if (project) {
          rows = sqlite
            .query(
              `SELECT pe.id, pe.project, pe.content, GROUP_CONCAT(t.name, ', ') as tags, pe.created_at
               FROM project_entries pe
               LEFT JOIN entry_tags et ON pe.id = et.entry_id
               LEFT JOIN tags t ON et.tag_id = t.id
               WHERE pe.project = ?
               GROUP BY pe.id ORDER BY pe.updated_at DESC LIMIT ?`,
            )
            .all(project, limit) as typeof rows;
        } else {
          rows = sqlite
            .query(
              `SELECT pe.id, pe.project, pe.content, GROUP_CONCAT(t.name, ', ') as tags, pe.created_at
               FROM project_entries pe
               LEFT JOIN entry_tags et ON pe.id = et.entry_id
               LEFT JOIN tags t ON et.tag_id = t.id
               GROUP BY pe.id ORDER BY pe.updated_at DESC LIMIT ?`,
            )
            .all(limit) as typeof rows;
        }
      }

      if (rows.length === 0) return "无匹配结果";

      const text = rows
        .map(
          (r) =>
            `[${r.project}] ${r.content}${r.tags ? `  #${r.tags}` : ""}  (${r.created_at.slice(0, 10)})`,
        )
        .join("\n\n");

      return `找到 ${rows.length} 条结果:\n\n${text}`;
    }

    default:
      return `❌ 未知 action: ${action}`;
  }
}

// ============================================================================
// shared_knowledge
// ============================================================================

export interface SharedKnowledgeParams {
  action: "add" | "search" | "promote";
  content?: string;
  domain?: string;
  source_entry_id?: number;
  limit?: number;
}

export async function sharedKnowledge(
  db: MemoryDB,
  params: SharedKnowledgeParams,
): Promise<ToolResult> {
  const sqlite = db.get();
  const { action, content, domain, source_entry_id, limit = 10 } = params;

  switch (action) {
    case "add": {
      if (!content?.trim()) return "❌ content 必填";
      sqlite.run(
        "INSERT INTO shared_knowledge (domain, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [domain?.trim() || null, content.trim(), nowISO(), nowISO()],
      );
      return "✅ 已添加共享知识";
    }

    case "search": {
      let rows: Array<{ id: number; domain: string | null; content: string; created_at: string }>;
      if (content?.trim()) {
        const safeQuery = safeFtsQuery(content);
        if (domain) {
          rows = sqlite
            .query(
              `SELECT sk.id, sk.domain, sk.content, sk.created_at
               FROM shared_knowledge sk
               JOIN shared_knowledge_fts fts ON sk.id = fts.rowid
               WHERE shared_knowledge_fts MATCH ? AND sk.domain = ?
               ORDER BY rank LIMIT ?`,
            )
            .all(safeQuery, domain, limit) as typeof rows;
        } else {
          rows = sqlite
            .query(
              `SELECT sk.id, sk.domain, sk.content, sk.created_at
               FROM shared_knowledge sk
               JOIN shared_knowledge_fts fts ON sk.id = fts.rowid
               WHERE shared_knowledge_fts MATCH ?
               ORDER BY rank LIMIT ?`,
            )
            .all(safeQuery, limit) as typeof rows;
        }
      } else if (domain) {
        rows = sqlite
          .query(
            `SELECT id, domain, content, created_at FROM shared_knowledge
             WHERE domain = ? ORDER BY updated_at DESC LIMIT ?`,
          )
          .all(domain, limit) as typeof rows;
      } else {
        rows = sqlite
          .query(
            `SELECT id, domain, content, created_at FROM shared_knowledge
             ORDER BY updated_at DESC LIMIT ?`,
          )
          .all(limit) as typeof rows;
      }

      if (rows.length === 0) return "无匹配结果";

      const text = rows
        .map(
          (r) =>
            `[${r.domain || "通用"}] ${r.content}  (${r.created_at.slice(0, 10)})`,
        )
        .join("\n\n");
      return `找到 ${rows.length} 条共享知识:\n\n${text}`;
    }

    case "promote": {
      if (!source_entry_id) return "❌ source_entry_id 必填";
      const entry = sqlite
        .query("SELECT content FROM project_entries WHERE id = ?")
        .get(source_entry_id) as { content: string } | undefined;

      if (!entry) return `❌ 未找到项目条目 id=${source_entry_id}`;

      sqlite.run(
        "INSERT INTO shared_knowledge (content, source_entry_id, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [entry.content, source_entry_id, nowISO(), nowISO()],
      );
      return `✅ 已将项目条目 #${source_entry_id} 升级为共享知识`;
    }

    default:
      return `❌ 未知 action: ${action}`;
  }
}
