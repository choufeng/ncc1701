---
name: atom-context-merge
description: >-
  将记忆搜索结果与当前需求上下文融合，产生综合上下文。
  触发场景：需要结合已有知识和新需求时。
layer: atom
metadata:
  standalone: true
---

## 用途
将记忆搜索结果与当前需求上下文融合，产生结构化综合上下文。

## 前置条件
- 已执行 atom-memory-search 获得记忆搜索结果
- 已获得 Jira Issue 信息

## 输入
- `memoryResults`: atom-memory-search 的输出
- `jiraContext`: Jira Issue 信息（标题、描述等）
- `currentRequirement`: 当前用户需求描述

## 执行步骤
1. 对比记忆结果与 Jira 需求，标记匹配点和差异点
2. 融合为统一上下文结构
3. 标注已知的经验教训和注意事项

## 输出
```json
{
  "mergedContext": "string",
  "matchedKnowledge": ["string"],
  "gaps": ["string"],
  "lessonsLearned": ["string"]
}
```

## 错误处理
- 输入数据不完整 → 标注缺失字段，用已有数据继续
