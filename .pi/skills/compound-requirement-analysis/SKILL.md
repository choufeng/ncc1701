---
name: compound-requirement-analysis
description: >-
  需求分析。触发场景：用户提出需求分析请求、提供 Jira URL、要求分析需求影响范围、或评估需求可行性时。
layer: compound
delegates-to:
  - molecule-jira-fetch
  - molecule-memory-merge
  - molecule-code-analysis
  - molecule-summary
---

## 用途
完整的端到端需求分析流程。从 Jira 需求出发，融合记忆库知识，分析代码影响，最终输出总结报告。

## 人类驱动点
> **铁律：一次只问一个问题。** 每次与用户交互时，仅提出一个问题，等待回答后再继续。
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

- **确认需求来源**：如果用户提供了 Jira URL，自动提取；否则请用户提供
- **确认分析深度**：询问是否需要代码级分析，还是仅需求文本级分析
- **确认展示方式**：在总结阶段询问展示格式

## 依赖的分子
使用 read 工具按需加载以下分子 skill：
- `../molecule-jira-fetch/SKILL.md`：获取 Jira 信息（第一阶段）
- `../molecule-memory-merge/SKILL.md`：搜索记忆融合上下文（第二阶段）
- `../molecule-code-analysis/SKILL.md`：分析代码影响（第三阶段）
- `../molecule-summary/SKILL.md`：生成总结展示（第四阶段）

## 编排策略

### 第一阶段：信息获取
1. 确认用户需求来源（Jira URL / Issue Key）
2. 加载 `molecule-jira-fetch`：获取 Jira 需求和关联信息

### 第二阶段：知识融合
3. 加载 `molecule-memory-merge`：搜索记忆库，融合已有知识和经验

### 第三阶段：代码分析（可选）
4. 询问用户是否需要代码级分析：
   - A) 是，进行完整代码分析 ⭐ 推荐
   - B) 否，仅基于需求文本和记忆知识输出总结
5. 如选 A，加载 `molecule-code-analysis`：搜索、追踪、评估代码影响

### 第四阶段：总结展示
6. 加载 `molecule-summary`：汇总所有结果，按用户选择的方式展示

## 成功标准
- Jira 需求信息已成功获取并解析
- 记忆库相关经验已融合（如可用）
- 代码影响已分析（如用户选择）
- 总结报告已生成并展示给用户

## 已知局限
- Jira 接口为桩实现，真实数据获取需要实际 API 接入
- 代码分析依赖项目结构，大型项目可能耗时较长
- 记忆库依赖 memory_search 工具可用性
