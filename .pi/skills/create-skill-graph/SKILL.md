---
name: create-skill-graph
description: >-
  创建 Skill Graph 三级架构的 Skill 文件。当用户需要新建业务流程、定义工作流 compound/molecule/atom 时触发。
  触发关键词：创建 Skill、新建流程、定义工作流、创建 compound、新建 molecule、新建 atom。
---

## 用途
根据用户需求，规划并创建完整的三级 Skill Graph 文件（compound → molecule → atom）及其拓扑配置。

## 三层架构

```
compound（化合物）  → 业务流程入口，人类驱动点，编排 molecule
molecule（分子）    → 流程阶段，编排 atom，组合 2-10 个原子
atom（原子）        → 单一职责操作，standalone: true，不调用其他 skill
```

## 人机交互规则
> **铁律：一次只问一个问题。** 每次与用户交互时，仅提出一个问题。
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

## 执行步骤

### 步骤 1：理解需求
分析用户描述的业务需求，提取：
- 目标：要完成什么业务
- 输入：需要什么数据/信息
- 输出：最终产出什么
- 约束：有什么限制条件

如果信息不完整，按人机交互规则逐步询问。

### 步骤 2：规划 compound
向用户确认 compound 结构：

```
拟创建 compound：[名称]

业务流程分解：
  阶段 1：[molecule 1 名称] — [职责描述]
  阶段 2：[molecule 2 名称] — [职责描述]
  ...

人类驱动点：[需要在哪些决策点让用户介入？]

确认以上规划？
  A) ⭐ 确认，按此创建
  B) 调整阶段划分
  C) 调整人类驱动点
  D) 自定义：___
```

### 步骤 3：逐阶段规划 molecule
对每个阶段，逐一询问 atom 分解：

```
阶段：[molecule 名称]

需要哪些原子操作？
  1. [atom 1 名称] — [操作描述]
  2. [atom 2 名称] — [操作描述]
  ...

编排顺序：[串行 / 并行 / 条件分支]

确认？
  A) ⭐ 确认
  B) 调整原子操作
  C) 自定义：___
```

**重复直到所有 molecule 确认完成。**

### 步骤 4：创建 SKILL.md 文件

对确认后的结构，按以下模板创建文件。

#### Atom 模板

```markdown
---
name: atom-<操作名>
description: >-
  <一两句话描述做什么和什么场景触发>
layer: atom
metadata:
  standalone: true
disable-model-invocation: true
---

## 用途
[一句话说明]

## 前置条件
[执行前需要满足的条件]

## 输入
[接受什么输入，格式要求]

## 执行步骤
[具体操作步骤]

## 输出
[产出格式]

## 错误处理
[异常情况的处理方式]
```

#### Molecule 模板

```markdown
---
name: molecule-<阶段名>
description: >-
  <描述解决什么问题和触发场景>
layer: molecule
delegates-to:
  - atom-<操作名1>
  - atom-<操作名2>
disable-model-invocation: true
---

## 用途
[说明]

## 依赖的原子
使用 read 工具按需加载以下原子 skill：
- `../atom-<操作名>/SKILL.md`：[用途]
- ...

## 编排流程
> **铁律：一次只问一个问题。**
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

[编排步骤]

## 输出
[产出格式]

## 失败处理
[异常处理]
```

#### Compound 模板

```markdown
---
name: compound-<业务名>
description: >-
  <描述业务流程和触发场景>
layer: compound
delegates-to:
  - molecule-<阶段名1>
  - molecule-<阶段名2>
---

## 用途
[完整业务流程说明]

## 人类驱动点
> **铁律：一次只问一个问题。**
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

[人类决策介入点]

## 依赖的分子
使用 read 工具按需加载以下分子 skill：
- `../molecule-<阶段名>/SKILL.md`：[用途]

## 编排策略
[默认顺序、并行时机、条件分支]

## 成功标准
[完成标志]

## 已知局限
[不可靠场景、注意事项]
```

### 步骤 5：更新 skill-graph.json

创建/更新 `.pi/skill-graph.json`：

```json
{
  "skills": [
    {
      "name": "compound-<业务名>",
      "layer": "compound",
      "delegatesTo": ["molecule-<阶段名1>", "molecule-<阶段名2>"],
      "standalone": false
    },
    {
      "name": "molecule-<阶段名>",
      "layer": "molecule",
      "delegatesTo": ["atom-<操作名1>", "atom-<操作名2>"],
      "standalone": false
    },
    {
      "name": "atom-<操作名>",
      "layer": "atom",
      "delegatesTo": [],
      "standalone": true
    }
  ]
}
```

**规则**：
- 所有 compound → standalone: false
- 所有 molecule → standalone: false
- 所有 atom → standalone: true
- 每个 skill 的 `delegatesTo` 与 SKILL.md frontmatter 保持一致

### 步骤 6：验证

创建完成后：
1. 验证所有 SKILL.md 文件存在
2. 验证 skill-graph.json 与 SKILL.md frontmatter 一致
3. 报告创建结果

## 命名规范

| 层级 | 前缀 | 示例 |
|------|------|------|
| Compound | `compound-` | `compound-requirement-analysis` |
| Molecule | `molecule-` | `molecule-jira-fetch` |
| Atom | `atom-` | `atom-jira-read` |

名称规则：小写字母 + 数字 + 连字符，最长 64 字符，与目录名一致。

## 注意事项
- Atom 的 `disable-model-invocation: true` 防止海量原子污染 `<available_skills>`
- Molecule 的 `disable-model-invocation: true` 仅在 compound 指引下加载
- Compound 不设 `disable-model-invocation`，确保用户在 available_skills 中可见
- Enforcer 扩展每次 `before_agent_start` 自动重载 `skill-graph.json`
