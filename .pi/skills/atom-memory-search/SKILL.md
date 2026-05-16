---
name: atom-memory-search
description: >-
  在记忆库中搜索与当前需求相关的内容。
  触发场景：需要融合已有知识和经验时。
layer: atom
metadata:
  standalone: true
---

## 用途
在 long-term memory 中搜索与当前主题相关的内容。

## 前置条件
- memory_search 工具可用
- 有明确的搜索 query

## 输入
- `query`: 搜索关键词
- `filters`: 可选过滤条件（如 category, project 等）

## 执行步骤
1. 使用 memory_search 工具执行搜索
2. 按相关度排序搜索结果
3. 提取 top-N 结果的关键信息

## 输出
```json
{
  "query": "string",
  "results": [
    {
      "content": "string",
      "relevance": "string",
      "source": "string"
    }
  ]
}
```

## 错误处理
- 无匹配结果 → 返回空列表，继续流程
- memory_search 不可用 → 跳过此步骤，标注原因
