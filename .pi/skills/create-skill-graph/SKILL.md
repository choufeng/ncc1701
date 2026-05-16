---
name: create-skill-graph
description: >-
  创建 Skill Graph 三级架构的 Skill 文件。当用户需要新建业务流程、定义工作流 compound/molecule/atom 时触发。
  触发关键词：创建 Skill、新建流程、定义工作流、创建 compound、新建 molecule、新建 atom。
---

## 用途
根据用户需求，创建 Skill Graph 文件（compound / molecule / atom）及其拓扑配置。支持两种模式：完整 compound 创建（自顶向下）和增量单层创建（自底向上）。

## 三层架构

```
compound（化合物）  → 业务流程入口，人类驱动点，编排 molecule
molecule（分子）    → 流程阶段，编排 atom，组合 2-10 个原子
atom（原子）        → 单一职责操作，standalone: true，不调用其他 skill
```

## 设计哲学
- **尽量下压决策**：编排逻辑写进正文，不依赖 agent 运行时判断
- **单向依赖**：依赖只能向下（compound → molecule → atom），严禁循环
- **不跨层依赖**：compound 不直接调用 atom，必须通过 molecule
- **原子不调用任何 skill**：原子是终止节点
- **人类驱动化合物**：compound 需要人在起点给意图，关键决策点介入

## 人机交互规则
> **铁律：一次只问一个问题。** 每次与用户交互时，仅提出一个问题。
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

---

## 创建模式 / 执行步骤

### 步骤 0：确定创建模式

首先向用户确认创建模式：

```
要创建什么？

  A) ⭐ 完整流程 — 一次规划完整的 compound → molecule → atom（见"模式 A"）
  B) 增量单层 — 只创建一个 atom / molecule / compound（见"模式 B"）
```

---

## 模式 A：完整 compound 创建（自顶向下）

### A-1：理解需求
分析用户描述的业务需求，提取目标、输入、输出、约束。信息不完整时按人机交互规则逐步询问。

### A-2：规划 compound
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

### A-3：逐阶段规划 molecule
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

重复直到所有 molecule 确认。完成后跳到"创建文件"。

---

## 模式 B：增量单层创建（自底向上）

### B-1：确定层级

询问以下问题（逐个询问，每次一个），确定应创建什么层级的 skill：

**第一个问题**：
```
这个 skill 是要做什么？

  A) 只做一件事，且不需要调用其他任何 skill → 创建 atom
  B) 组合 2-10 个已有的原子，完成一个有范围的任务 → 创建 molecule
  C) 编排多个分子，完成跨域复杂任务 → 创建 compound
  D) 不确定，帮我分析 → 我将帮你判断
```

### B-2：检查依赖是否存在（仅 molecule / compound）

**如果创建的是 molecule**：
- 扫描 `.pi/skills/` 目录，列出所有已存在的 atom
- 要求用户选择 2-10 个作为依赖
- 若所需 atom 不存在，先创建缺少的 atom，再创建本 molecule

**如果创建的是 compound**：
- 扫描 `.pi/skills/` 目录，列出所有已存在的 molecule
- 要求用户选择 2-10 个作为依赖
- 若所需 molecule 不存在，先创建缺少的 molecule，再创建本 compound

**原则：自底向上。先建依赖，再建调用方。**

### B-3：确认 skill 内容

按对应层级的模板逐项确认一次只问一个问题。

---

## 创建文件

按以下模板创建 SKILL.md 文件。原子遵循自底向上（atom → molecule → compound）。

### Atom 模板

```markdown
---
name: atom-<操作名>
description: >-
  <一两句话描述做什么和什么场景触发，应回答"在什么情况下该用这个 skill">
layer: atom
metadata:
  standalone: true
disable-model-invocation: true
---

## 用途
[一句话说明这个原子做什么]

## 前置条件
[执行前需要满足的条件，如：需要哪些环境变量、文件、权限]

## 输入
[接受什么输入，格式要求]

## 执行步骤
1. [步骤 1，极其具体，不留歧义]
2. [步骤 2]
3. [步骤 3]

## 输出
[产出什么，格式是什么]

## 错误处理
[遇到什么情况应停止并报告，而不是继续推进]
```

### Molecule 模板

```markdown
---
name: molecule-<阶段名>
description: >-
  <描述解决什么问题和触发场景，应回答"在什么情况下该用这个 skill">
layer: molecule
delegates-to:
  - atom-<操作名1>
  - atom-<操作名2>
disable-model-invocation: true
---

## 用途
[说明这个分子解决什么问题]

## 依赖的原子
使用 read 工具按需加载以下原子 skill：
- `../atom-<操作名>/SKILL.md`：[一句话说明用于什么步骤]
- ...

## 编排流程
> **铁律：一次只问一个问题。**
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

1. 加载并执行 `atom-<操作名1>`：[说明传入什么、期望得到什么]
2. 根据 atom-1 的结果：
   - 如果 [条件 A]，加载并执行 `atom-<操作名2>`
   - 如果 [条件 B]，直接进入步骤 3
3. 加载并执行 `atom-<操作名3>`：[说明]

## 输出
[整体产出什么]

## 失败处理
[某个原子失败时，整体如何响应]
```

### Compound 模板

```markdown
---
name: compound-<业务名>
description: >-
  <描述业务流程和触发场景，应回答"在什么情况下该用这个 skill">
layer: compound
delegates-to:
  - molecule-<阶段名1>
  - molecule-<阶段名2>
---

## 用途
[说明这个化合物对应的业务流程或工作剧本]

## 人类驱动点
> **铁律：一次只问一个问题。**
> **选项推荐规则：** 提供 2-4 个选项 + ⭐ 推荐标记 + 自定义输入。

[说明人类需要在哪些决策点介入，以及介入方式]

## 依赖的分子
使用 read 工具按需加载以下分子 skill：
- `../molecule-<阶段名>/SKILL.md`：[用于什么阶段]

## 编排策略
[默认顺序、并行时机、条件分支。允许 agent 有较高自主判断，
但仍应尽量明确]

## 成功标准
[什么状态代表化合物执行完成]

## 已知局限
[在哪些场景下可能不可靠，人类应注意什么]
```

---

## 更新 skill-graph.json

创建或更新 `.pi/skill-graph.json`：

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
- `delegatesTo` 与 SKILL.md frontmatter 严格一致
- 已存在的条目保留，只追加新条目，不覆盖

---

## 创建后验证清单

创建完成后，逐项检查。任一项不通过则修复后再继续：

- [ ] **name 与目录名完全一致**：skill 的 `name` 字段 = 所在目录名
- [ ] **layer 字段正确**：取值与实际行为一致（atom / molecule / compound）
- [ ] **description 清晰**：描述用途和触发场景，而非实现步骤
- [ ] **原子：不含 delegates-to**：atom 的 frontmatter 中没有 `delegates-to` 字段，正文不引用其他 skill
- [ ] **分子/化合物：delegates-to 完整且存在**：列出所有被调度的下层 skill，且对应的 SKILL.md 已存在
- [ ] **正文相对路径可解析**：`../atom-xxx/SKILL.md` 等路径从本 skill 目录可定位
- [ ] **无循环依赖**：依赖链不回指自身（A → B → A）
- [ ] **无跨层依赖**：compound 不直接调用 atom，molecule 不调用 compound
- [ ] **依赖数量合法**：molecule 依赖 ≤ 10 个 atom，compound 依赖 ≤ 10 个 molecule

---

## 命名规范

| 层级 | 前缀 | 示例 |
|------|------|------|
| Compound | `compound-` | `compound-requirement-analysis` |
| Molecule | `molecule-` | `molecule-jira-fetch` |
| Atom | `atom-` | `atom-jira-read` |

**名称规则**：小写字母 a-z、数字 0-9、连字符。最长 64 字符。与目录名一致。不以连字符开头/结尾。不含连续连字符 `--`。

---

## 常见反模式（创建时必须避免）

| 反模式 | 表现 | 修正 |
|--------|------|------|
| 原子做多件事 | 一个 atom 完成两个独立操作 | 拆分为两个 atom |
| 依赖未声明 | 正文调用了某 skill 但 delegates-to 未列出 | 补充 delegates-to 字段 |
| 依赖不存在 | delegates-to 引用了尚未创建的 skill | 先创建依赖 |
| 化合物直接调原子 | compound 跳过 molecule 直接引用 atom | 包装成 molecule |
| description 写实现 | 描述实现步骤而非触发场景 | 回答"什么情况下该用" |
| 全自动化合物 | 化合物无人类介入节点 | 在关键决策点设确认 |

---

## 注意事项
- Atom 的 `disable-model-invocation: true` 防止海量原子污染 `<available_skills>`
- Molecule 的 `disable-model-invocation: true` 仅在 compound 指引下加载
- Compound 不设 `disable-model-invocation`，确保用户在 available_skills 中可见
- **自底向上**：增量模式下，先创建依赖（atom），再创建调用方（molecule → compound）
- Enforcer 扩展每次 `before_agent_start` 自动重载 `skill-graph.json`
