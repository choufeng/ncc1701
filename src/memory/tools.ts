/**
 * 项目 Memory Tools
 *
 * 注册到 Agent 的工具函数，支持多项目记忆和共享知识。
 * 每个操作拆分为独立纯函数，返回 Result 类型区分成功/失败。
 */

import type { Database } from "bun:sqlite"
import type { MemoryDB } from "./db"
import { safeFtsQuery, nowISO } from "./db"
import { ok, err, type Result } from "../result"

// ============================================================================
// Types
// ============================================================================

export interface ProjectMemoryParams {
  action: "add" | "replace" | "remove" | "search"
  project?: string
  content?: string
  old_text?: string
  tags?: string[]
  limit?: number
}

export interface SharedKnowledgeParams {
  action: "add" | "search" | "promote"
  content?: string
  domain?: string
  source_entry_id?: number
  limit?: number
}

type MemoryError = { kind: "memory"; message: string }
type ToolResult = Result<string, MemoryError>

// ============================================================================
// project_memory: add

function addEntry(
  sqlite: Database,
  params: ProjectMemoryParams,
): ToolResult {
  const { project, content, tags } = params

  if (!project) return err({ kind: "memory", message: "❌ project 必填" })
  if (!content?.trim()) return err({ kind: "memory", message: "❌ content 必填" })

  const result = sqlite.run(
    "INSERT INTO project_entries (project, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
    [project, content.trim(), nowISO(), nowISO()],
  )
  const entryId = Number(result.lastInsertRowid)

  if (tags && tags.length > 0) {
    insertTags(sqlite, entryId, tags)
  }

  const tagSuffix = tags?.length ? ` (标签: ${tags.join(", ")})` : ""
  return ok(`✅ 已添加项目 ${project} 的记忆 (id=${entryId})${tagSuffix}`)
}

function insertTags(sqlite: Database, entryId: number, tags: readonly string[]): void {
  const addTag = sqlite.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)")
  const linkTag = sqlite.prepare("INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)")
  const getTag = sqlite.prepare("SELECT id FROM tags WHERE name = ?")

  for (const tag of tags) {
    const trimmed = tag.trim()
    addTag.run(trimmed)
    const row = getTag.get(trimmed) as { id: number }
    linkTag.run(entryId, row.id)
  }
}

// ============================================================================
// project_memory: replace

function replaceEntry(
  sqlite: Database,
  params: ProjectMemoryParams,
): ToolResult {
  const { project, content, old_text } = params

  if (!old_text?.trim()) return err({ kind: "memory", message: "❌ old_text 必填" })
  if (!content?.trim()) return err({ kind: "memory", message: "❌ content 必填" })

  const rows = findEntriesByText(sqlite, old_text, project)

  const [match] = rows
  if (!match) return err({ kind: "memory", message: `❌ 未找到匹配 "${old_text}" 的条目` })
  if (rows.length > 1) {
    const preview = rows.map((r) => `- [${r.id}] ${r.content.slice(0, 80)}...`).join("\n")
    return err({ kind: "memory", message: `❌ 找到 ${rows.length} 个匹配，请精确 old_text:\n${preview}` })
  }

  sqlite.run(
    "UPDATE project_entries SET content = ?, updated_at = ? WHERE id = ?",
    [content.trim(), nowISO(), match.id],
  )

  return ok(`✅ 已替换条目 (id=${match.id})`)
}

// ============================================================================
// project_memory: remove

function removeEntry(
  sqlite: Database,
  params: ProjectMemoryParams,
): ToolResult {
  const { project, old_text } = params

  if (!old_text?.trim()) return err({ kind: "memory", message: "❌ old_text 必填" })

  const rows = findEntriesByText(sqlite, old_text, project)

  const [match] = rows
  if (!match) return err({ kind: "memory", message: `❌ 未找到匹配 "${old_text}" 的条目` })
  if (rows.length > 1) {
    const preview = rows.map((r) => `- [${r.id}] ${r.content.slice(0, 80)}...`).join("\n")
    return err({ kind: "memory", message: `❌ 找到 ${rows.length} 个匹配，请精确 old_text:\n${preview}` })
  }

  sqlite.run("DELETE FROM project_entries WHERE id = ?", [match.id])
  return ok(`✅ 已删除条目 (id=${match.id})`)
}

// ============================================================================
// project_memory: search

function searchEntries(
  sqlite: Database,
  params: ProjectMemoryParams,
): ToolResult {
  const { project, content, tags, limit = 10 } = params

  const trimmedContent = content?.trim()
  const rows = trimmedContent
    ? searchByFts(sqlite, safeFtsQuery(trimmedContent), project, limit)
    : tags && tags.length > 0
      ? searchByTags(sqlite, tags, project, limit)
      : searchRecent(sqlite, project, limit)

  if (rows.length === 0) return ok("无匹配结果")

  const text = rows
    .map((r) => `[${r.project}] ${r.content}${r.tags ? `  #${r.tags}` : ""}  (${r.created_at.slice(0, 10)})`)
    .join("\n\n")

  return ok(`找到 ${rows.length} 条结果:\n\n${text}`)
}

// ============================================================================
// 共享查询辅助函数

interface EntryRow {
  id: number
  project: string
  content: string
  tags: string | null
  created_at: string
}

function findEntriesByText(
  sqlite: Database,
  text: string | undefined,
  project?: string,
): Array<{ id: number; content: string }> {
  const trimmed = text?.trim() ?? ""
  const query = project
    ? "SELECT id, content FROM project_entries WHERE project = ? AND content LIKE ?"
    : "SELECT id, content FROM project_entries WHERE content LIKE ?"
  const params = project ? [project, `%${trimmed}%`] : [`%${trimmed}%`]
  return sqlite.query(query).all(...params) as Array<{ id: number; content: string }>
}

function searchByFts(
  sqlite: Database,
  safeQuery: string,
  project: string | undefined,
  limit: number,
): EntryRow[] {
  const baseSQL = `
    SELECT pe.id, pe.project, pe.content, GROUP_CONCAT(t.name, ', ') as tags, pe.created_at
    FROM project_entries pe
    JOIN project_entries_fts fts ON pe.id = fts.rowid
    LEFT JOIN entry_tags et ON pe.id = et.entry_id
    LEFT JOIN tags t ON et.tag_id = t.id`

  if (project) {
    return sqlite.query(
      `${baseSQL} WHERE project_entries_fts MATCH ?1 AND pe.project = ?2 GROUP BY pe.id ORDER BY rank LIMIT ?3`,
    ).all(safeQuery, project, limit) as EntryRow[]
  }
  return sqlite.query(
    `${baseSQL} WHERE project_entries_fts MATCH ? GROUP BY pe.id ORDER BY rank LIMIT ?`,
  ).all(safeQuery, limit) as EntryRow[]
}

function searchByTags(
  sqlite: Database,
  tags: readonly string[],
  project: string | undefined,
  limit: number,
): EntryRow[] {
  const placeholders = tags.map(() => "?").join(", ")
  const baseSQL = `
    SELECT pe.id, pe.project, pe.content, GROUP_CONCAT(t2.name, ', ') as tags, pe.created_at
    FROM project_entries pe
    JOIN entry_tags et ON pe.id = et.entry_id
    JOIN tags t ON et.tag_id = t.id
    LEFT JOIN entry_tags et2 ON pe.id = et2.entry_id
    LEFT JOIN tags t2 ON et2.tag_id = t2.id`

  if (project) {
    return sqlite.query(
      `${baseSQL} WHERE pe.project = ? AND t.name IN (${placeholders}) GROUP BY pe.id ORDER BY pe.updated_at DESC LIMIT ?`,
    ).all(project, ...tags.map((t) => t.trim()), limit) as EntryRow[]
  }
  return sqlite.query(
    `${baseSQL} WHERE t.name IN (${placeholders}) GROUP BY pe.id ORDER BY pe.updated_at DESC LIMIT ?`,
  ).all(...tags.map((t) => t.trim()), limit) as EntryRow[]
}

function searchRecent(
  sqlite: Database,
  project: string | undefined,
  limit: number,
): EntryRow[] {
  const baseSQL = `
    SELECT pe.id, pe.project, pe.content, GROUP_CONCAT(t.name, ', ') as tags, pe.created_at
    FROM project_entries pe
    LEFT JOIN entry_tags et ON pe.id = et.entry_id
    LEFT JOIN tags t ON et.tag_id = t.id`

  if (project) {
    return sqlite.query(
      `${baseSQL} WHERE pe.project = ? GROUP BY pe.id ORDER BY pe.updated_at DESC LIMIT ?`,
    ).all(project, limit) as EntryRow[]
  }
  return sqlite.query(
    `${baseSQL} GROUP BY pe.id ORDER BY pe.updated_at DESC LIMIT ?`,
  ).all(limit) as EntryRow[]
}

// ============================================================================
// shared_knowledge: add

function addSharedKnowledge(
  sqlite: Database,
  params: SharedKnowledgeParams,
): ToolResult {
  if (!params.content?.trim()) return err({ kind: "memory", message: "❌ content 必填" })

  sqlite.run(
    "INSERT INTO shared_knowledge (domain, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
    [params.domain?.trim() || null, params.content.trim(), nowISO(), nowISO()],
  )
  return ok("✅ 已添加共享知识")
}

// ============================================================================
// shared_knowledge: search

function searchSharedKnowledge(
  sqlite: Database,
  params: SharedKnowledgeParams,
): ToolResult {
  const { content, domain, limit = 10 } = params

  const rows = content?.trim()
    ? searchSharedByFts(sqlite, safeFtsQuery(content), domain, limit)
    : searchSharedByDomain(sqlite, domain, limit)

  if (rows.length === 0) return ok("无匹配结果")

  const text = rows
    .map((r) => `[${r.domain || "通用"}] ${r.content}  (${r.created_at.slice(0, 10)})`)
    .join("\n\n")

  return ok(`找到 ${rows.length} 条共享知识:\n\n${text}`)
}

interface SharedRow {
  id: number
  domain: string | null
  content: string
  created_at: string
}

function searchSharedByFts(
  sqlite: Database,
  safeQuery: string,
  domain: string | undefined,
  limit: number,
): SharedRow[] {
  if (domain) {
    return sqlite.query(
      `SELECT sk.id, sk.domain, sk.content, sk.created_at
       FROM shared_knowledge sk
       JOIN shared_knowledge_fts fts ON sk.id = fts.rowid
       WHERE shared_knowledge_fts MATCH ? AND sk.domain = ?
       ORDER BY rank LIMIT ?`,
    ).all(safeQuery, domain, limit) as SharedRow[]
  }
  return sqlite.query(
    `SELECT sk.id, sk.domain, sk.content, sk.created_at
     FROM shared_knowledge sk
     JOIN shared_knowledge_fts fts ON sk.id = fts.rowid
     WHERE shared_knowledge_fts MATCH ?
     ORDER BY rank LIMIT ?`,
  ).all(safeQuery, limit) as SharedRow[]
}

function searchSharedByDomain(
  sqlite: Database,
  domain: string | undefined,
  limit: number,
): SharedRow[] {
  if (domain) {
    return sqlite.query(
      "SELECT id, domain, content, created_at FROM shared_knowledge WHERE domain = ? ORDER BY updated_at DESC LIMIT ?",
    ).all(domain, limit) as SharedRow[]
  }
  return sqlite.query(
    "SELECT id, domain, content, created_at FROM shared_knowledge ORDER BY updated_at DESC LIMIT ?",
  ).all(limit) as SharedRow[]
}

// ============================================================================
// shared_knowledge: promote

function promoteEntry(
  sqlite: Database,
  params: SharedKnowledgeParams,
): ToolResult {
  if (!params.source_entry_id) return err({ kind: "memory", message: "❌ source_entry_id 必填" })

  const entry = sqlite
    .query("SELECT content FROM project_entries WHERE id = ?")
    .get(params.source_entry_id) as { content: string } | undefined

  if (!entry) return err({ kind: "memory", message: `❌ 未找到项目条目 id=${params.source_entry_id}` })

  sqlite.run(
    "INSERT INTO shared_knowledge (content, source_entry_id, created_at, updated_at) VALUES (?, ?, ?, ?)",
    [entry.content, params.source_entry_id, nowISO(), nowISO()],
  )
  return ok(`✅ 已将项目条目 #${params.source_entry_id} 升级为共享知识`)
}

// ============================================================================
// 公开入口函数

/** project_memory 工具入口，返回 Result 区分成功/失败 */ 
export async function projectMemory(
  db: MemoryDB,
  params: ProjectMemoryParams,
): Promise<string> {
  const sqlite = db.get()
  const handlers: Record<ProjectMemoryParams["action"], (sqlite: Database, params: ProjectMemoryParams) => ToolResult> = {
    add: addEntry,
    replace: replaceEntry,
    remove: removeEntry,
    search: searchEntries,
  }

  const handler = handlers[params.action]
  if (!handler) return `❌ 未知 action: ${params.action}`

  const result = handler(sqlite, params)
  return result.ok ? result.value : result.error.message
}

/** shared_knowledge 工具入口，返回 Result 区分成功/失败 */
export async function sharedKnowledge(
  db: MemoryDB,
  params: SharedKnowledgeParams,
): Promise<string> {
  const sqlite = db.get()
  const handlers: Record<SharedKnowledgeParams["action"], (sqlite: Database, params: SharedKnowledgeParams) => ToolResult> = {
    add: addSharedKnowledge,
    search: searchSharedKnowledge,
    promote: promoteEntry,
  }

  const handler = handlers[params.action]
  if (!handler) return `❌ 未知 action: ${params.action}`

  const result = handler(sqlite, params)
  return result.ok ? result.value : result.error.message
}
