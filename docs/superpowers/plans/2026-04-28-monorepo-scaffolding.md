# Polyglot Monorepo Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a basic pnpm workspace with Turborepo for multi-language orchestration.

**Architecture:** A standard monorepo structure with `apps/` and `packages/` directories, managed by `pnpm` for JS/TS and `turbo` for cross-project task execution.

**Tech Stack:** pnpm, Turborepo, Node.js.

---

### Task 1: Initialize Root Configurations

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**
```json
{
  "name": "ncc1701",
  "private": true,
  "description": "Polyglot Monorepo",
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "format": "prettier --write \"**/*.{js,ts,json,md,yaml,yml}\""
  },
  "devDependencies": {
    "turbo": "latest",
    "prettier": "latest"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create .gitignore**
```text
node_modules
.turbo
dist
.env
*.log
.venv
__pycache__
```

- [ ] **Step 4: Commit**
```bash
git add package.json pnpm-workspace.yaml .gitignore
git commit -m "chore: initialize root workspace configurations"
```

---

### Task 2: Configure Turborepo Pipeline

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: Create turbo.json**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "out/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add turbo.json
git commit -m "chore: configure turborepo pipeline"
```

---

### Task 3: Scaffold Directory Structure & Example Package

**Files:**
- Create: `apps/.gitkeep`
- Create: `packages/shared-configs/package.json`

- [ ] **Step 1: Create directory placeholders**
```bash
mkdir -p apps packages/shared-configs
touch apps/.gitkeep
```

- [ ] **Step 2: Create an internal shared config package**
```json
{
  "name": "@ncc1701/shared-configs",
  "version": "0.0.0",
  "private": true,
  "description": "Shared project configurations"
}
```

- [ ] **Step 3: Commit**
```bash
git add apps/.gitkeep packages/shared-configs/package.json
git commit -m "chore: scaffold directory structure and shared-configs package"
```

---

### Task 4: Finalize Installation

- [ ] **Step 1: Run pnpm install**
Run: `pnpm install`
Expected: `node_modules` created, lockfile generated.

- [ ] **Step 2: Commit lockfile**
```bash
git add pnpm-lock.yaml
git commit -m "chore: generate pnpm lockfile"
```
