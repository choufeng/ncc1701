---
name: atom-code-search
description: >-
  在代码库中搜索与需求相关的文件和代码片段。
  触发场景：需要定位与需求相关的代码时。
layer: atom
metadata:
  standalone: true
---

## 用途
在项目代码库中搜索与需求相关的代码。

## 前置条件
- 有明确的搜索目标（关键词、函数名、文件名模式）
- grep/find/glob 工具可用

## 输入
- `keywords`: 搜索关键词列表
- `filePatterns`: 文件名匹配模式（可选，如 "*.ts", "*.test.ts"）

## 执行步骤
1. 对每个 keyword 执行 grep 搜索
2. 对 filePatterns 执行 find 查找
3. 汇总匹配文件路径和行号
4. 去重并排序

## 输出
```json
{
  "matches": [
    {
      "file": "string",
      "line": "number",
      "content": "string"
    }
  ],
  "totalFiles": "number",
  "searchKeywords": ["string"]
}
```

## 错误处理
- 无匹配结果 → 返回空列表，扩大搜索范围或调整关键词
