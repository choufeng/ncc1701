const ASSISTANT_MARKER = '\n## 助手\n'

const blocks: Record<string, (text: string) => string> = {
  user: (text) => `\n## 用户\n${text}\n`,
  assistant: (text) => `${ASSISTANT_MARKER}${text}`,
  tool_call: (text) => `\n🔧 工具: ${text} → ⏳ 执行中\n`,
  tool_result: (text) => `\n🔧 工具: ${text} → ✅ 完成\n`,
}

export function appendMarkdown(content: string, role: string, text: string): string {
  const fn = blocks[role]
  return fn ? content + fn(text) : content + text
}

/** 追加流式 delta 到最后一个 assistant 块，不重复创建标题 */
export function appendStreamDelta(content: string, delta: string): string {
  const idx = content.lastIndexOf(ASSISTANT_MARKER)
  if (idx !== -1) {
    const before = content.slice(0, idx)
    const existing = content.slice(idx + ASSISTANT_MARKER.length)
    return before + ASSISTANT_MARKER + existing + delta
  }
  return content + ASSISTANT_MARKER + delta
}
