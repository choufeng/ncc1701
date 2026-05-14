export function appendMarkdown(content: string, role: string, text: string): string {
  const blocks: Record<string, string> = {
    user: `\n## 用户\n${text}\n`,
    assistant: `\n## 助手\n${text}\n`,
    tool_call: `\n🔧 工具: ${text} → ⏳ 执行中\n`,
    tool_result: `\n🔧 工具: ${text} → ✅ 完成\n`,
  }
  return content + (blocks[role] ?? text)
}
