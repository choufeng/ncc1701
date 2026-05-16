---
name: atom-jira-read
description: >-
  读取单条 Jira Issue 的详细信息，返回标题、描述、状态、指派人等字段。
  触发场景：需要获取指定 Jira Issue 的详细内容时。
layer: atom
metadata:
  standalone: true
---

## 用途
读取单条 Jira Issue 的完整信息。

## 前置条件
- 提供有效的 Jira Issue Key（如 PROJECT-123）
- 需要 Jira API 访问权限（暂为桩实现）

## 输入
- `issueKey`: Jira Issue Key 字符串

## 执行步骤
1. 校验 issueKey 格式（PROJECT-数字）
2. 调用 Jira REST API `GET /rest/api/2/issue/{issueKey}`
3. 解析响应，提取 title、description、status、assignee、priority
4. 返回结构化数据

## 输出
```json
{
  "issueKey": "string",
  "title": "string",
  "description": "string",
  "status": "string",
  "assignee": "string | null",
  "priority": "string"
}
```

## 错误处理
- issueKey 格式无效 → 报告格式错误，要求重新输入
- API 请求失败 → 报告网络错误，建议重试
- Issue 不存在 → 报告 404，确认 issueKey 正确性
