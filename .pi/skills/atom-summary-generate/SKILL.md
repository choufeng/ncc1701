---
name: atom-summary-generate
description: >-
  根据所有分析结果生成最终总结报告。触发场景：所有分析步骤完成后需要输出结论时。
layer: atom
metadata:
  standalone: true
---

## 用途
生成结构化最终总结报告。

## 前置条件
- 所有前序 molecule 已完成
- 所有分析数据已就绪

## 输入
- `jiraInfo`: Jira Issue 信息
- `memoryContext`: 记忆融合上下文
- `codeEvaluation`: 代码评估结果

## 执行步骤
1. 汇总三个数据源的结论
2. 按"背景 → 分析 → 影响 → 建议"结构组织
3. 生成 Markdown 格式的总结报告

## 输出
```markdown
# 需求分析总结：[需求标题]

## 背景
[Jira 需求和关联信息摘要]

## 已有知识
[记忆库中的相关经验和教训]

## 代码影响
[受影响的文件和模块、复杂度评估]

## 建议
[具体行动建议和优先级]
```

## 错误处理
- 某个数据源为空 → 在报告中标注"暂无相关数据"
