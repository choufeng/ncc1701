---
name: atom-skill-display
description: >-
  使用指定 Skill 格式化并展示总结内容到用户界面。
  触发场景：需要以特定格式展示结果时。
layer: atom
metadata:
  standalone: true
---

## 用途
使用特定 Skill 格式化并展示总结内容。

## 前置条件
- atom-summary-generate 已完成，有总结报告
- 目标展示 Skill 可用（如 write-blog, visualizing-analysis 等）

## 输入
- `summaryReport`: atom-summary-generate 的输出
- `displaySkill`: 目标展示 Skill 名称（可选，默认直接文本输出）

## 执行步骤
1. 如果指定了 displaySkill，加载并执行对应 Skill
2. 否则直接以 Markdown 格式输出总结
3. 确认内容完整展示

## 输出
以指定形式展示的总结内容。

## 错误处理
- 指定 Skill 不存在 → 回退到直接 Markdown 输出，标注
