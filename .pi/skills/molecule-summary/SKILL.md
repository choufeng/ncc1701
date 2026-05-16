---
name: molecule-summary
description: >-
  生成最终分析总结并使用 Skill 展示。
  触发场景：所有分析步骤完成后需要向用户呈现结果时。
layer: molecule
delegates-to:
  - atom-summary-generate
  - atom-skill-display
---

## 用途
汇总所有分析结果，生成结构化总结报告并展示。

## 依赖的原子
使用 read 工具按需加载以下原子 skill：
- `../atom-summary-generate/SKILL.md`：生成总结报告
- `../atom-skill-display/SKILL.md`：格式化展示

## 编排流程
> **铁律：一次只问一个问题。**
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

1. 收集所有前序 molecule 的输出
2. 加载并执行 `atom-summary-generate`：传入全部分析数据，生成总结报告
3. 询问用户展示方式：
   - A) 直接文本展示
   - B) 使用 write-blog Skill 保存为文章
   - C) 使用 visualizing-analysis Skill 生成可视化分析 ⭐ 推荐
   - D) 自定义：___
4. 加载并执行 `atom-skill-display`：传入总结报告 + 用户选择的展示方式

## 输出
总结报告（格式取决于用户选择的展示方式）。

## 失败处理
- atom-summary-generate 失败 → 尝试基于已有数据手动组织总结
- atom-skill-display 失败 → 回退到直接文本输出
