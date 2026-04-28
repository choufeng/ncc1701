# Design Spec: ncc1701 Polyglot Monorepo Architecture

**Date**: 2026-04-28
**Status**: Pending Review
**Tech Stack**: Turborepo, pnpm, Multi-language support (Node.js, Python, etc.)

## 1. Background & Goals
Construct a Monorepo capable of housing multiple programming languages with high-performance build caching and task orchestration. This architecture addresses the coexistence and collaboration between JS/TS dependencies and non-JS languages (e.g., Python) within a single repository.

## 2. Core Architecture

### 2.1 Directory Structure
```text
ncc1701/
├── apps/                # Independent application projects
│   ├── web/             # Example: Frontend app (Node.js)
│   └── service/         # Example: Backend service (Python/Go)
├── packages/            # Shared packages and configurations
│   ├── config-eslint/   # Shared ESLint configurations
│   └── shared-schema/   # Shared protocol definitions (e.g., Protobuf/OpenAPI)
├── docs/                # Documentation hub
│   └── superpowers/     # Superpowers specs and design docs
├── package.json         # Root configuration
├── pnpm-workspace.yaml  # pnpm workspace definition
└── turbo.json           # Turborepo orchestration configuration
```

### 2.2 Task Orchestration (Turborepo)
Task pipelines are defined via `turbo.json` to ensure tasks execute according to dependency order and leverage caching:
- **build**: Executes build processes for all sub-projects.
- **test**: Runs unit tests across all projects.
- **lint**: Performs static code analysis.

For non-JS projects, proxy scripts will be defined in their local `package.json` (e.g., `"build": "make build"`) so that Turborepo can orchestrate them uniformly.

### 2.3 Dependency Management Strategy
- **JS/TS**: Managed by `pnpm` at the root for workspace-wide dependency handling.
- **Python**: Uses independent virtual environments (Poetry recommended) within each app directory, triggered by root-level scripts.
- **Global Tools**: The root directory only installs cross-project development tools (e.g., `turbo`, `prettier`, `husky`).

## 3. Configuration Previews

### pnpm-workspace.yaml
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### turbo.json (Core Snippet)
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

## 4. Future Scalability
- **CI/CD**: Leverage Turborepo remote caching to accelerate continuous integration.
- **Polyglot Consistency**: Use `packages/shared-schema` to enforce interface contracts across different languages.
