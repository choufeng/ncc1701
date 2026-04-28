# 设计文档：ncc1701 多语言 Monorepo 架构

**日期**: 2026-04-28
**状态**: 待评审
**工具栈**: Turborepo, pnpm, 多语言支持 (Node.js, Python 等)

## 1. 背景与目标
构建一个能够容纳多种编程语言、具备高效构建缓存和任务编排能力的 Monorepo 仓库。该架构需解决 JS/TS 依赖管理与非 JS 语言（如 Python）在同一个仓库下的共存与协作问题。

## 2. 核心架构设计

### 2.1 目录结构
```text
ncc1701/
├── apps/                # 独立应用项目
│   ├── web/             # 示例：前端应用 (Node.js)
│   └── service/         # 示例：后端服务 (Python/Go)
├── packages/            # 共享包与配置
│   ├── config-eslint/   # 共享 ESLint 配置
│   └── shared-schema/   # 共享协议定义 (如 Protobuf/OpenAPI)
├── docs/                # 文档中心
│   └── superpowers/     # Superpowers 规范与设计文档
├── package.json         # 根目录配置
├── pnpm-workspace.yaml  # pnpm 工作区定义
└── turbo.json           # Turborepo 任务编排配置
```

### 2.2 任务编排 (Turborepo)
通过 `turbo.json` 定义任务管道，确保任务按依赖顺序执行并利用缓存：
- **build**: 执行各子项目的构建。
- **test**: 运行单元测试。
- **lint**: 代码静态检查。

对于非 JS 项目，将在其 `package.json` 中定义代理脚本（如 `"build": "make build"`），使 Turborepo 能够统一调度。

### 2.3 依赖管理策略
- **JS/TS**: 由根目录的 `pnpm` 统一管理工作区依赖。
- **Python**: 在各自应用目录下使用独立的虚拟环境（推荐 Poetry），通过根目录脚本进行触发。
- **全局工具**: 根目录仅安装跨项目的开发工具（如 `turbo`, `prettier`, `husky`）。

## 3. 关键配置文件预览

### pnpm-workspace.yaml
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### turbo.json (核心片段)
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

## 4. 后续扩展性
- **CI/CD**: 利用 Turborepo 的远程缓存加速持续集成。
- **多语言一致性**: 通过 `packages/shared-schema` 强制执行跨语言的接口契约。
