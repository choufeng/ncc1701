---
name: atom-code-evaluate
description: >-
  评估与需求相关的代码，识别实现难度、风险和影响范围。
  触发场景：需要评估代码变更的影响时。
layer: atom
metadata:
  standalone: true
---

## 用途
评估代码变更难度、风险和影响范围。

## 前置条件
- atom-code-trace 已完成，有调用图
- atom-code-search 已完成，有代码匹配结果

## 输入
- `codeMatches`: atom-code-search 输出
- `callGraph`: atom-code-trace 输出
- `mergedContext`: atom-context-merge 输出

## 执行步骤
1. 分析受影响文件数量和类型
2. 评估变更复杂度（低/中/高）
3. 识别高风险区域（核心逻辑、共享模块）
4. 汇总影响范围

## 输出
```json
{
  "complexity": "low|medium|high",
  "affectedFiles": ["string"],
  "riskAreas": ["string"],
  "estimatedEffort": "string",
  "recommendations": ["string"]
}
```

## 错误处理
- 输入数据不完整 → 基于已有数据评估，标注置信度
