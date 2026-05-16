---
name: molecule-jira-fetch
description: >-
  获取 Jira Issue 信息及其关联 Issue。触发场景：用户提供 Jira URL 或 Issue Key 时。
layer: molecule
delegates-to:
  - atom-jira-read
  - atom-jira-related
---

## 用途
获取指定 Jira Issue 的完整信息和关联 Issue 列表。

## 依赖的原子
使用 read 工具按需加载以下原子 skill：
- `../atom-jira-read/SKILL.md`：读取 Jira Issue 详细信息
- `../atom-jira-related/SKILL.md`：获取关联 Issue 列表

## 编排流程
> **铁律：一次只问一个问题。** 与用户交互时，每次仅提出一个问题。
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

1. 如果用户未提供 Jira Issue Key，询问用户提供：
   - ⭐ 如果用户消息包含 URL，从中提取 issueKey
   - 否则请用户输入 issueKey

2. 加载并执行 `atom-jira-read`：传入 issueKey，获取 Jira Issue 详细信息

3. 加载并执行 `atom-jira-related`：传入 issueKey，获取关联 Issue 列表

4. 汇总两个原子的输出，生成 Jira 信息摘要

## 输出
```json
{
  "primaryIssue": { "issueKey": "string", "title": "string", "description": "string", "status": "string", "assignee": "string | null", "priority": "string" },
  "relatedIssues": [{ "issueKey": "string", "relationType": "string", "title": "string", "status": "string" }],
  "summary": "string"
}
```

## 失败处理
- atom-jira-read 失败 → 终止本 molecule，报告失败原因
- atom-jira-related 失败 → 继续执行，关联列表置空并标注
