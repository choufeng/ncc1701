import {
  createCliRenderer,
  type CliRenderer,
  TextRenderable,
  BoxRenderable,
  InputRenderable,
  MarkdownRenderable,
  ScrollBoxRenderable,
  SyntaxStyle,
} from "@opentui/core"
import { appendMarkdown as appendMd } from "./pipeline"

export interface UIHandle {
  readonly renderer: CliRenderer
  readonly input: InputRenderable
  readonly markdown: MarkdownRenderable
  readonly scrollBox: ScrollBoxRenderable
  readonly titleBar: TextRenderable
  appendMarkdown(role: string, text: string): void
  setStreaming(streaming: boolean): void
  updateTitle(info: string): void
}

// ⚠️ 副作用：终端 I/O
export async function createUI(): Promise<UIHandle> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    targetFps: 30,
  })

  // 标题栏
  const titleBar = new TextRenderable(renderer, {
    id: "title-bar",
    content: "ncc1701 · initializing...",
    height: 1,
    paddingX: 1,
  })

  // 可滚动区域
  const scrollBox = new ScrollBoxRenderable(renderer, {
    id: "scroll-area",
    flexGrow: 1,
    scrollY: true,
    stickyScroll: true,
    stickyStart: "bottom",
  })

  // Markdown 内容
  const syntaxStyle = SyntaxStyle.create()
  const markdown = new MarkdownRenderable(renderer, {
    id: "md-content",
    syntaxStyle,
    streaming: false,
  })

  scrollBox.content.add(markdown)

  // 输入框容器
  const inputBar = new BoxRenderable(renderer, {
    id: "input-bar",
    height: 3,
    border: true,
    borderColor: "gray",
  })

  const input = new InputRenderable(renderer, {
    id: "user-input",
    placeholder: "输入消息...",
  })

  inputBar.add(input)

  // 根布局：纵向排列
  renderer.root.flexDirection = "column"
  renderer.root.add(titleBar)
  renderer.root.add(scrollBox)
  renderer.root.add(inputBar)

  // 焦点到输入框
  renderer.focusRenderable(input)

  let currentContent = ""

  return {
    renderer,
    input,
    markdown,
    scrollBox,
    titleBar,
    appendMarkdown(role: string, text: string): void {
      currentContent = appendMd(currentContent, role, text)
      markdown.content = currentContent
    },
    setStreaming(streaming: boolean): void {
      markdown.streaming = streaming
    },
    updateTitle(info: string): void {
      titleBar.content = `ncc1701 · ${info}`
    },
  }
}
