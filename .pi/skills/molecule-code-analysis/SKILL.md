---
name: molecule-code-analysis
description: >-
  分析代码库中与需求相关的代码。
  触发场景：需要评估需求对代码的影响时。
layer: molecule
delegates-to:
  - atom-code-search
  - atom-code-trace
  - atom-code-evaluate
---

## 用途
在代码库中搜索、追踪和评估与需求相关的代码。

## 依赖的原子
使用 read 工具按需加载以下原子 skill：
- `../atom-code-search/SKILL.md`：搜索相关代码
- `../atom-code-trace/SKILL.md`：追踪调用链
- `../atom-code-evaluate/SKILL.md`：评估代码影响

## 编排流程
> **铁律：一次只问一个问题。**
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

1. 从上下文融合结果中提取搜索关键词
2. 加载并执行 `atom-code-search`：传入 keywords，定位相关代码文件
3. 加载并执行 `atom-code-trace`：传入匹配文件，追踪调用链
4. 加载并执行 `atom-code-evaluate`：传入搜索结果 + 调用图 + 融合上下文，评估影响
5. 输出代码分析结果

## 输出
```json
{
  "codeMatches": [{ "file": "string", "line": "number", "content": "string" }],
  "callGraph": { "nodes": ["string"], "edges": [{ "from": "string", "to": "string", "type": "string" }] },
  "evaluation": { "complexity": "string", "affectedFiles": ["string"], "riskAreas": ["string"], "estimatedEffort": "string", "recommendations": ["string"] }
}
```

## 失败处理
- 无匹配代码 → 报告中标注"未找到相关代码"
