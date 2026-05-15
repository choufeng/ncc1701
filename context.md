# Code Context

## Files Retrieved
1. `package.json` (全文) — 项目依赖声明，唯一运行时依赖 `@opentui/core@^0.2.10`，运行时 Bun（非 Node）
2. `tsconfig.json` (全文) — Bun 标准配置，ESM-only，bundler moduleResolution，strict 模式
3. `index.ts` (全文) — 仅 `console.log("Hello via Bun!")`，项目尚未开始实际开发
4. `CLAUDE.md` (全文) — 项目规划文档，定义了 pi-mono 生态（pi-ai + pi-agent-core）集成的目标
5. `.gitignore` (全文) — 标准 Bun/Node 忽略规则
6. `context.md` (全文) — 前次 scout 产物，记录 pi-tui 已废弃及 TUI 选型分析
7. `node_modules/@opentui/core/package.json` (1-30) — 已安装的 TUI 库元数据
8. `node_modules/@opentui/core/README.md` (1-60) — OpenTUI 使用文档入口
9. `node_modules/@opentui/core/renderer.d.ts` (1-80) — CliRenderer 核心类型定义
10. `node_modules/@opentui/core/types.d.ts` (全文) — RenderContext、TerminalCapabilities 等关键类型
11. `node_modules/@opentui/core/Renderable.d.ts` (1-60) — Renderable 基类，LayoutOptions 定义
12. `node_modules/@opentui/core/renderables/Box.d.ts` (1-30) — Box 组件，支持 border/background/title
13. `node_modules/@opentui/core/renderables/Text.d.ts` (1-30) — Text 组件，StyledText 内容渲染
14. `node_modules/@opentui/core/renderables/Input.d.ts` (1-40) — Input 单行输入组件
15. `node_modules/@opentui/core/renderables/Markdown.d.ts` (1-30) — Markdown 渲染组件
16. `node_modules/@opentui/core/renderables/ScrollBox.d.ts` (1-30) — 可滚动容器组件

## Key Code

### 项目当前状态
项目处于初始化阶段，`index.ts` 仅有 placeholder。实际运行时依赖仅 `@opentui/core`（已安装），pi-ai/pi-agent-core **尚未安装**。

### OpenTUI 核心 API（已安装可用）

```typescript
// 创建渲染器（异步）
import { createCliRenderer, TextRenderable, BoxRenderable, InputRenderable, MarkdownRenderable, ScrollBoxRenderable } from "@opentui/core"

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  targetFps: 60,
})

// 文本
const text = new TextRenderable(renderer, { id: "msg", content: "Hello!" })

// 输入框（单行，支持 placeholder）
const input = new InputRenderable(renderer, { id: "input", placeholder: "Type here..." })

// Markdown 渲染
const md = new MarkdownRenderable(renderer, { id: "md" })

// 布局：Renderable 基类支持 yoga-layout 的 flex 属性
// flexGrow, flexDirection, alignItems, justifyContent, padding, margin 等
```

### 关键类型
- `CliRenderer` — 渲染器主类，管理终端输出、键盘/鼠标事件、焦点管理
- `Renderable` — 所有 UI 组件基类，支持 flex 布局（基于 yoga-layout）
- `RenderContext` — 渲染上下文接口，提供 requestRender、setCursorPosition 等
- `BoxRenderable` — 容器组件，支持 border、backgroundColor、title
- `TextRenderable` — 文本显示，支持 StyledText
- `InputRenderable` — 单行输入，继承 TextareaRenderable
- `MarkdownRenderable` — Markdown 解析渲染
- `ScrollBoxRenderable` — 可滚动容器

### CliRenderer 事件系统
```typescript
interface RendererEvents {
  resize: (width: number, height: number) => void
  key: (data: Buffer) => void
  selection: (selection: Selection) => void
  focused_renderable: (current, previous) => void
  theme_mode: (mode: ThemeMode) => void
  // ...
}
```

## Architecture

```
ncc1701/
├── index.ts          # 入口（当前为 placeholder）
├── package.json      # Bun 项目，依赖 @opentui/core
├── tsconfig.json     # ESM + strict + bundler
└── CLAUDE.md         # 项目规划：pi-ai + pi-agent-core + TUI 的终端 Agent demo
```

**目标架构（CLAUDE.md 描述）：**
1. pi-ai → 统一 LLM API（getModel + stream/complete + agentLoop）
2. pi-agent-core → Agent 运行时（状态管理、事件流）— 或直接用 pi-ai agentLoop
3. @opentui/core → 终端 TUI（替代已废弃的 pi-tui）

**实际现状：**
- 仅安装了 @opentui/core，pi-ai/pi-agent-core 未安装
- TUI 层已从原 pi-tui 切换到 @opentui/core（OpenTUI，Zig 原生核心）
- 项目使用 Bun 运行时（非 Node），注意 CLAUDE.md 中提到的 `npx tsx` 应改为 `bun run`
- context.md 记录了 pi-tui 废弃分析，建议用 @earendil-works/pi-tui，但实际已选 @opentui/core

**数据流（规划）：**
```
用户输入 (InputRenderable)
  → Agent 逻辑 (pi-ai agentLoop / pi-agent-core Agent)
  → LLM 调用 (pi-ai stream/complete)
  → 工具执行 (文件读写/Shell/搜索)
  → 流式输出 (MarkdownRenderable)
```

## Start Here
打开 `index.ts` — 这是唯一需要编写的入口文件。项目从零开始，需：
1. 决定是否使用 pi-agent-core（CLAUDE.md 提到最小 demo 可能直接用 pi-ai agentLoop）
2. 安装 pi-ai（和可选 pi-agent-core）：`bun add @mariozechner/pi-ai@0.70.6`
3. 用 @opentui/core 搭建 TUI 布局（参考 `node_modules/@opentui/core/README.md`）
4. 在 `index.ts` 中串联：TUI 输入 → agentLoop → 流式 Markdown 输出

注意：CLAUDE.md 中 stack 描述与实际安装不一致（文档描述 pi-tui，实际用 opentui/core），开发时以实际 package.json 为准。
