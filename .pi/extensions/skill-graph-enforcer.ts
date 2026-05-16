import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// 1. Skill Graph Topology Definition
// ============================================================================

interface SkillNode {
  name: string;
  layer: "compound" | "molecule" | "atom";
  delegatesTo: string[];
  standalone: boolean;
}

interface SkillGraphConfig {
  skills: SkillNode[];
}

let SKILL_GRAPH: SkillNode[] = [];
let SKILL_MAP: Map<string, SkillNode> = new Map();

function loadSkillGraph(cwd: string): void {
  const configPath = path.join(cwd, ".pi", "skill-graph.json");
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      const config: SkillGraphConfig = JSON.parse(raw);
      SKILL_GRAPH = config.skills;
      SKILL_MAP = new Map(SKILL_GRAPH.map((s) => [s.name, s]));
    } else {
      SKILL_GRAPH = [];
      SKILL_MAP = new Map();
    }
  } catch {
    SKILL_GRAPH = [];
    SKILL_MAP = new Map();
  }
}

// ============================================================================
// 2. Runtime State
// ============================================================================

interface LoadingState {
  loadedSkills: Set<string>;
  activeCompound: string | null;
  loadHistory: Array<{
    skill: string;
    timestamp: number;
    context: string;
  }>;
}

function createLoadingState(): LoadingState {
  return {
    loadedSkills: new Set(),
    activeCompound: null,
    loadHistory: [],
  };
}

// ============================================================================
// 3. Core Validation Logic
// ============================================================================

function detectSkillNameFromPath(path: string): string | null {
  const match = path.match(/skills\/([^/]+)\//);
  return match ? match[1] : null;
}

function validateTopDownLoading(
  targetSkill: string,
  state: LoadingState
): { valid: boolean; reason?: string; suggestion?: string } {
  const node = SKILL_MAP.get(targetSkill);

  // Skill not in graph — allow pass-through
  if (!node) return { valid: true };

  // Compound is always a valid entry point
  if (node.layer === "compound") return { valid: true };

  // Standalone skills are allowed to be invoked independently
  if (node.standalone) return { valid: true };

  // Molecule: verify that a parent compound has been loaded
  if (node.layer === "molecule") {
    const parents = SKILL_GRAPH.filter(
      (s) =>
        s.layer === "compound" && s.delegatesTo.includes(targetSkill)
    );
    if (!parents.some((p) => state.loadedSkills.has(p.name))) {
      return {
        valid: false,
        reason: `Cross-layer violation: molecule "${targetSkill}" was loaded directly, but its parent compound has not been loaded`,
        suggestion: `Load one of the following compounds first: ${parents
          .map((p) => p.name)
          .join(", ")}`,
      };
    }
  }

  // Atom: verify that a parent molecule has been loaded
  if (node.layer === "atom") {
    const parents = SKILL_GRAPH.filter(
      (s) =>
        s.layer === "molecule" && s.delegatesTo.includes(targetSkill)
    );
    if (!parents.some((p) => state.loadedSkills.has(p.name))) {
      return {
        valid: false,
        reason: `Cross-layer violation: atom "${targetSkill}" was loaded directly, skipping the molecule layer`,
        suggestion: `Load one of the following molecules first: ${parents
          .map((p) => p.name)
          .join(", ")}`,
      };
    }
  }

  return { valid: true };
}

function detectCircularDependency(
  targetSkill: string,
  state: LoadingState
): { hasCycle: boolean; cycle?: string } {
  const recentSkills = state.loadHistory.slice(-10).map((h) => h.skill);
  const seen = new Set<string>();
  for (const skill of recentSkills) {
    if (seen.has(skill)) {
      return {
        hasCycle: true,
        cycle: `Potential circular dependency detected: "${skill}" was loaded more than once`,
      };
    }
    seen.add(skill);
  }
  return { hasCycle: false };
}

// ============================================================================
// 4. Skill Graph Topology Prompt Generator
// ============================================================================

function generateGraphPrompt(): string {
  if (SKILL_GRAPH.length === 0) {
    return `\n## Skill Graph\n\nNo registered Skill Graph workflows. Use the create-skill-graph skill to create one.\n`;
  }

  let prompt = `\n## Skill Graph Loading Rules\n\n`;
  prompt += `You must load skills strictly according to the following hierarchy, starting from the top-level compound and descending layer by layer:\n\n`;

  for (const compound of SKILL_GRAPH.filter(
    (s) => s.layer === "compound"
  )) {
    prompt += `**${compound.name}**\n`;
    for (const moleculeName of compound.delegatesTo) {
      const molecule = SKILL_MAP.get(moleculeName);
      prompt += `  └─ ${moleculeName}\n`;
      if (molecule) {
        for (const atomName of molecule.delegatesTo) {
          prompt += `     └─ ${atomName}\n`;
        }
      }
    }
    prompt += `\n`;
  }

  prompt += `### Mandatory Rules\n`;
  prompt += `1. **Start from the compound**: load the compound SKILL.md first, then load its dependent molecules on demand\n`;
  prompt += `2. **No cross-layer calls**: compounds only invoke molecules, molecules only invoke atoms, atoms invoke no skills\n`;
  prompt += `3. **Load on demand**: only read a SKILL.md when the execution step that needs it is reached\n`;
  prompt += `4. **No circular dependencies**: never load the same skill more than once\n\n`;

  const standaloneAtoms = SKILL_GRAPH.filter(
    (s) => s.layer === "atom" && s.standalone
  );
  if (standaloneAtoms.length > 0) {
    prompt += `### Standalone Skills (Direct Invocation Allowed)\n`;
    prompt += `The following atoms are marked as standalone and may be invoked directly by sub-agents:\n`;
    for (const atom of standaloneAtoms) {
      prompt += `- \`${atom.name}\`\n`;
    }
    prompt += `\n`;
  }

  prompt += `### Loading Template\n`;
  prompt += `1. read compound-xxx/SKILL.md        ← entry point; understand the full workflow\n`;
  prompt += `2. read molecule-yyy/SKILL.md        ← load the molecule needed for the current step\n`;
  prompt += `3. read atom-zzz/SKILL.md            ← the molecule directs you to load the required atom\n`;
  prompt += `4. Execute the atom's operation\n`;
  prompt += `5. Return to the molecule to continue with the next step\n`;

  return prompt;
}

// ============================================================================
// 5. Extension Registration
// ============================================================================

export default function skillGraphEnforcer(api: ExtensionAPI): void {
  const state = createLoadingState();

  // Load topology on startup
  loadSkillGraph(process.cwd());

  // Inject Skill Graph topology before each agent start
  api.on("before_agent_start", (ctx) => {
    // Reload topology (may have been updated by create-skill-graph)
    loadSkillGraph(process.cwd());
    const graphPrompt = generateGraphPrompt();
    ctx.additionalContext = (ctx.additionalContext || "") + graphPrompt;
  });

  // Intercept read tool calls to validate hierarchy
  api.on("tool_call", (ctx) => {
    if (ctx.toolName !== "read") return;

    const skillName = detectSkillNameFromPath(ctx.args.path || "");
    if (!skillName) return;

    // Circular dependency detection
    const cycleCheck = detectCircularDependency(skillName, state);
    if (cycleCheck.hasCycle) {
      api.showMessage({
        type: "warning",
        text: cycleCheck.cycle!,
      });
      return;
    }

    // Hierarchy validation
    const validation = validateTopDownLoading(skillName, state);
    if (!validation.valid) {
      api.showMessage({
        type: "error",
        text: `${validation.reason}\n${validation.suggestion}`,
      });
      return;
    }

    // Record load history
    state.loadHistory.push({
      skill: skillName,
      timestamp: Date.now(),
      context: "tool_call",
    });
  });

  // Update loading state after read returns
  api.on("tool_result", (ctx) => {
    if (ctx.toolName !== "read") return;

    const skillName = detectSkillNameFromPath(ctx.args.path || "");
    if (!skillName) return;

    const node = SKILL_MAP.get(skillName);
    if (!node) return;

    state.loadedSkills.add(skillName);

    // Track active compound
    if (node.layer === "compound") {
      state.activeCompound = skillName;
    }
  });

  // Reset state on new session
  api.on("session_start", () => {
    loadSkillGraph(process.cwd());
    state.loadedSkills.clear();
    state.activeCompound = null;
    state.loadHistory = [];
  });
}
