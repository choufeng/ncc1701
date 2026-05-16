---
name: atom-code-trace
description: >-
  追踪指定代码的调用链和依赖关系。触发场景：需要理解代码的执行路径或依赖关系时。
layer: atom
metadata:
  standalone: true
---

## 用途
追踪代码调用链和依赖关系。

## 前置条件
- atom-code-search 已完成，有入口文件列表
- read 工具可用

## 输入
- `entryFiles`: 入口文件列表（来自 atom-code-search）
- `depth`: 追踪深度（默认 3 层）

## 执行步骤
1. 从 entryFiles 开始读取每个文件
2. 提取 import 语句和函数调用
3. 递归追踪被引用的文件（受 depth 限制）
4. 构建调用关系图

## 输出
```json
{
  "callGraph": {
    "nodes": ["file/path"],
    "edges": [
      { "from": "file/path", "to": "file/path", "type": "import|call" }
    ]
  },
  "entryPoints": ["string"],
  "maxDepth": "number"
}
```

## 错误处理
- 文件不可读 → 跳过并标注
- 循环引用 → 检测到后截断，标注
