---
name: create-skill-graph
description: >-
  Create Skill Graph files (compound, molecule, atom) and their topology configuration. Use when the user requests a new business process, workflow definition, or individual skill creation.
  Trigger keywords: create skill, new workflow, define process, create compound, create molecule, create atom.
---

## Purpose
Create Skill Graph files and topology configuration based on user requirements. Supports two modes: full compound creation (top-down) and incremental single-layer creation (bottom-up).

## Three-Tier Architecture

```
compound  →  High-level orchestration, human-driven, delegates to molecules
molecule  →  Workflow stage, explicit orchestration of 2–10 atoms
atom      →  Single-responsibility operation, standalone, never calls other skills
```

## Design Philosophy
- **Push decisions down**: Encode orchestration logic in skill body text; don't leave it to agent runtime judgment.
- **Unidirectional dependencies**: Dependencies flow only downward (compound → molecule → atom). Circular dependencies are forbidden.
- **No cross-layer calls**: Compounds must not call atoms directly; they go through molecules.
- **Atoms call no skills**: Atoms are leaf nodes. They never reference or invoke other skills.
- **Human-driven compounds**: Compounds require human intent at the entry point and human confirmation at key decision gates.

## Human-Interaction Rules
> **Iron Rule: One question at a time.** Ask only one question per interaction. Wait for the answer before proceeding.
> **Option Recommendation Rule:** Present 2–4 options + ⭐ recommended pick + free-text fallback.

---

## Creation Modes / Execution Steps

### Step 0: Determine Creation Mode

Ask the user which mode they want:

```
What would you like to create?

  A) ⭐ Full workflow — plan a complete compound → molecule → atom tree in one pass (see "Mode A")
  B) Incremental — create a single atom, molecule, or compound (see "Mode B")
```

---

## Mode A: Full Compound Creation (Top-Down)

### A-1: Understand the Requirement
Analyze the user's request. Extract: goal, inputs, outputs, constraints. If information is incomplete, ask one question at a time following the human-interaction rules.

### A-2: Plan the Compound
Confirm the compound structure with the user:

```
Proposed compound: <name>

Business process breakdown:
  Stage 1: <molecule name> — <responsibility>
  Stage 2: <molecule name> — <responsibility>
  ...

Human decision gates: <at which decision points should the user intervene?>

Confirm?
  A) ⭐ Confirm, proceed
  B) Adjust stage breakdown
  C) Adjust decision gates
  D) Custom: ___
```

### A-3: Plan Each Molecule
For each stage, ask about atom decomposition one at a time:

```
Stage: <molecule name>

Which atomic operations are needed?
  1. <atom name> — <description>
  2. <atom name> — <description>
  ...

Orchestration: <sequential / parallel / conditional branching>

Confirm?
  A) ⭐ Confirm
  B) Adjust atoms
  C) Custom: ___
```

Repeat until all molecules are confirmed. Then proceed to "Creating Files."

---

## Mode B: Incremental Single-Layer Creation (Bottom-Up)

### B-1: Determine the Layer

Ask the following questions one at a time to determine which layer to create:

**First question:**
```
What is the scope of this skill?

  A) A single operation with no dependency on other skills → create an atom
  B) Composes 2–10 existing atoms to complete a well-scoped task → create a molecule
  C) Orchestrates multiple molecules to complete a cross-domain complex task → create a compound
  D) Not sure — help me decide
```

### B-2: Check Dependency Existence (molecule / compound only)

**If creating a molecule:**
- Scan `.pi/skills/` and list all existing atoms.
- Ask the user to select 2–10 atoms as dependencies.
- If any required atom does not exist, create the missing atom first, then return to this molecule.

**If creating a compound:**
- Scan `.pi/skills/` and list all existing molecules.
- Ask the user to select 2–10 molecules as dependencies.
- If any required molecule does not exist, create the missing molecule first, then return to this compound.

**Principle: Bottom-up. Create dependencies before dependents.**

### B-3: Confirm Skill Content
Confirm each section of the template one question at a time, following the human-interaction rules.

---

## Creating Files

Write `SKILL.md` files using the templates below. Follow bottom-up order for incremental creation (atom → molecule → compound).

### Atom Template

```markdown
---
name: atom-<operation-name>
description: >-
  <Concise description of what it does and when to trigger — answer "when should I use this skill?">
layer: atom
metadata:
  standalone: true
disable-model-invocation: true
---

## Purpose
[One sentence describing what this atom does]

## Prerequisites
[Conditions that must be met, e.g.: required environment variables, files, permissions]

## Input
[Expected input and format]

## Execution Steps
1. [Step 1 — extremely specific, no ambiguity]
2. [Step 2]
3. [Step 3]

## Output
[Expected output and format]

## Error Handling
[Cases where execution must stop and report, rather than continue]
```

### Molecule Template

```markdown
---
name: molecule-<stage-name>
description: >-
  <Concise description of the problem it solves and when to trigger — answer "when should I use this skill?">
layer: molecule
delegates-to:
  - atom-<operation-name-1>
  - atom-<operation-name-2>
disable-model-invocation: true
---

## Purpose
[Describe what problem this molecule solves]

## Dependent Atoms
Load the following atom skills on demand using the read tool:
- `../atom-<name>/SKILL.md`: [one-line description of the step it serves]
- ...

## Orchestration Flow
> **Iron Rule: One question at a time.**
> **Option Recommendation Rule:** Present 2–4 options + ⭐ recommended pick + free-text fallback.

1. Load and execute `atom-<name-1>`: [describe inputs and expected output]
2. Based on the result of atom-1:
   - If [condition A], load and execute `atom-<name-2>`
   - If [condition B], proceed directly to step 3
3. Load and execute `atom-<name-3>`: [description]

## Output
[Overall output]

## Failure Handling
[How the molecule responds when an atom fails]
```

### Compound Template

```markdown
---
name: compound-<business-name>
description: >-
  <Describe the business process or workflow and when to trigger — answer "when should I use this skill?">
layer: compound
delegates-to:
  - molecule-<stage-name-1>
  - molecule-<stage-name-2>
---

## Purpose
[Describe the business process or workflow this compound orchestrates]

## Human Decision Gates
> **Iron Rule: One question at a time.**
> **Option Recommendation Rule:** Present 2–4 options + ⭐ recommended pick + free-text fallback.

[Describe at which decision points the human must intervene, and how]

## Dependent Molecules
Load the following molecule skills on demand using the read tool:
- `../molecule-<name>/SKILL.md`: [which stage it handles]

## Orchestration Strategy
[Default sequence, parallelism opportunities, conditional branches. Allow agents higher autonomy,
but still be as explicit as possible]

## Success Criteria
[What constitutes completion of this compound]

## Known Limitations
[Scenarios where this compound may be unreliable; caveats the human should be aware of]
```

---

## Update skill-graph.json

Create or update `.pi/skill-graph.json`:

```json
{
  "skills": [
    {
      "name": "compound-<business-name>",
      "layer": "compound",
      "delegatesTo": ["molecule-<stage-name-1>", "molecule-<stage-name-2>"],
      "standalone": false
    },
    {
      "name": "molecule-<stage-name>",
      "layer": "molecule",
      "delegatesTo": ["atom-<operation-name-1>", "atom-<operation-name-2>"],
      "standalone": false
    },
    {
      "name": "atom-<operation-name>",
      "layer": "atom",
      "delegatesTo": [],
      "standalone": true
    }
  ]
}
```

**Rules:**
- All compounds → `standalone: false`
- All molecules → `standalone: false`
- All atoms → `standalone: true`
- `delegatesTo` must match the SKILL.md frontmatter exactly
- Preserve existing entries; append only new ones — never overwrite

---

## Post-Creation Validation Checklist

After creating files, verify each item. If any fails, fix it before proceeding:

- [ ] **name matches directory name exactly**: the `name` field equals the parent directory name
- [ ] **layer field is correct**: the value reflects actual behavior (`atom` / `molecule` / `compound`)
- [ ] **description describes trigger scenario**: describes when to use the skill, not how it is implemented
- [ ] **Atom has no delegates-to**: atoms must not contain the `delegates-to` field in frontmatter, and must not reference other skills in the body
- [ ] **Molecule / Compound delegates-to is complete and resolvable**: all referenced skills are listed, and their SKILL.md files exist
- [ ] **Body-relative paths are resolvable**: `../atom-xxx/SKILL.md` and similar paths resolve from the skill's directory
- [ ] **No circular dependencies**: the dependency chain must not loop back to itself (A → B → A)
- [ ] **No cross-layer dependencies**: compounds must not call atoms directly; molecules must not call compounds
- [ ] **Dependency count is within limits**: molecule depends on ≤ 10 atoms; compound depends on ≤ 10 molecules

---

## Naming Conventions

| Layer | Prefix | Example |
|-------|--------|---------|
| Compound | `compound-` | `compound-requirement-analysis` |
| Molecule | `molecule-` | `molecule-jira-fetch` |
| Atom | `atom-` | `atom-jira-read` |

**Name rules**: Lowercase a–z, digits 0–9, hyphens. Max 64 characters. Must match directory name. Must not start or end with a hyphen. Must not contain consecutive hyphens (`--`).

---

## Anti-Patterns (must avoid during creation)

| Anti-Pattern | Manifestation | Fix |
|--------------|---------------|-----|
| Atom doing too much | One atom performs two independent operations | Split into two atoms |
| Undeclared dependency | Body invokes a skill not listed in delegates-to | Add to delegates-to |
| Missing dependency | delegates-to references a skill that does not exist yet | Create the dependency first |
| Compound calls atom directly | Compound skips the molecule layer | Wrap atoms into a molecule first |
| Description describes implementation | Body describes implementation steps instead of trigger scenarios | Answer "when should I use this?" |
| Fully-automated compound | Compound has no human intervention gates | Add human confirmation at key decision points |

---

## Notes
- Atoms use `disable-model-invocation: true` to prevent flooding `<available_skills>` at scale.
- Molecules use `disable-model-invocation: true` so they are only loaded when a compound directs it.
- Compounds omit `disable-model-invocation` so they remain visible in `<available_skills>`.
- **Bottom-up**: In incremental mode, create dependencies (atoms) before dependents (molecules → compounds).
- The Enforcer extension reloads `skill-graph.json` automatically on every `before_agent_start`.
