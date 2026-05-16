---
name: atom-jira-related
description: >-
  获取与指定 Jira Issue 相关联的其他 Issue 列表。
  触发场景：需要了解某个需求的周边依赖和关联项时。
layer: atom
metadata:
  standalone: true
---

## 用途
获取 Jira Issue 的关联 Issue 列表。

## 前置条件
- 提供有效的 Jira Issue Key
- 需要 Jira API 访问权限（暂为桩实现）

## 输入
- `issueKey`: Jira Issue Key 字符串
- `relationTypes`: 关联类型过滤（可选，如 "blocks", "relates to"）

## 执行步骤
1. 校验 issueKey 格式
2. 调用 Jira API `GET /rest/api/2/issue/{issueKey}/remotelink` 和 issuelink 接口
3. 按 relationTypes 过滤关联 Issue
4. 返回关联 Issue 列表

## 输出
```json
{
  "issueKey": "string",
  "related": [
    {
      "issueKey": "string",
      "relationType": "string",
      "title": "string",
      "status": "string"
    }
  ]
}
```

## 错误处理
- 无关联 Issue → 返回空列表，不视为错误
- API 请求失败 → 报告网络错误
