---
name: molecule-memory-merge
description: >-
  搜索记忆库并融合为需求上下文。触发场景：需要结合已有知识和经验分析需求时。
layer: molecule
delegates-to:
  - atom-memory-search
  - atom-context-merge
---

## 用途
在记忆库中搜索相关内容，与 Jira 需求信息融合为统一上下文。

## 依赖的原子
使用 read 工具按需加载以下原子 skill：
- `../atom-memory-search/SKILL.md`：搜索记忆库
- `../atom-context-merge/SKILL.md`：融合上下文

## 编排流程
> **铁律：一次只问一个问题。**
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

1. 从 molecule-jira-fetch 输出中提取关键信息作为搜索 query
2. 加载并执行 `atom-memory-search`：传入 query，搜索记忆库
3. 加载并执行 `atom-context-merge`：传入记忆搜索结果 + Jira 信息，融合上下文
4. 输出融合后的综合上下文

## 输出
```json
{
  "mergedContext": "string",
  "matchedKnowledge": ["string"],
  "gaps": ["string"],
  "lessonsLearned": ["string"]
}
```

## 失败处理
- 记忆库不可用 → 跳过本 molecule，标注原因，继续后续步骤
