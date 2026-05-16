import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

// ============================================================================
// 1. Skill Graph 拓扑定义
// ============================================================================

interface SkillNode {
  name: string;
  layer: "compound" | "molecule" | "atom";
  delegatesTo: string[];
  standalone: boolean;
}

const SKILL_GRAPH: SkillNode[] = [
  // Compounds
  {
    name: "compound-requirement-analysis",
    layer: "compound",
    delegatesTo: [
      "molecule-jira-fetch",
      "molecule-memory-merge",
      "molecule-code-analysis",
      "molecule-summary",
    ],
    standalone: false,
  },

  // Molecules
  {
    name: "molecule-jira-fetch",
    layer: "molecule",
    delegatesTo: ["atom-jira-read", "atom-jira-related"],
    standalone: false,
  },
  {
    name: "molecule-memory-merge",
    layer: "molecule",
    delegatesTo: ["atom-memory-search", "atom-context-merge"],
    standalone: false,
  },
  {
    name: "molecule-code-analysis",
    layer: "molecule",
    delegatesTo: [
      "atom-code-search",
      "atom-code-trace",
      "atom-code-evaluate",
    ],
    standalone: false,
  },
  {
    name: "molecule-summary",
    layer: "molecule",
    delegatesTo: ["atom-summary-generate", "atom-skill-display"],
    standalone: false,
  },

  // Atoms (all standalone)
  {
    name: "atom-jira-read",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-jira-related",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-memory-search",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-context-merge",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-code-search",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-code-trace",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-code-evaluate",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-summary-generate",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
  {
    name: "atom-skill-display",
    layer: "atom",
    delegatesTo: [],
    standalone: true,
  },
];

const SKILL_MAP = new Map(SKILL_GRAPH.map((s) => [s.name, s]));

// ============================================================================
// 2. 运行时状态
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
// 3. 核心验证逻辑
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

  // 不在 Graph 中的 skill，不干预
  if (!node) return { valid: true };

  // Compound 始终是入口点
  if (node.layer === "compound") return { valid: true };

  // standalone skill 允许独立调用
  if (node.standalone) return { valid: true };

  // Molecule：检查父 compound 是否已加载
  if (node.layer === "molecule") {
    const parents = SKILL_GRAPH.filter(
      (s) =>
        s.layer === "compound" && s.delegatesTo.includes(targetSkill)
    );
    if (!parents.some((p) => state.loadedSkills.has(p.name))) {
      return {
        valid: false,
        reason: `跨层违规：molecule "${targetSkill}" 被直接加载，但其父 compound 尚未加载`,
        suggestion: `请先加载以下 compound 之一：${parents
          .map((p) => p.name)
          .join(", ")}`,
      };
    }
  }

  // Atom：检查父 molecule 是否已加载
  if (node.layer === "atom") {
    const parents = SKILL_GRAPH.filter(
      (s) =>
        s.layer === "molecule" && s.delegatesTo.includes(targetSkill)
    );
    if (!parents.some((p) => state.loadedSkills.has(p.name))) {
      return {
        valid: false,
        reason: `跨层违规：atom "${targetSkill}" 被直接加载，跳过了 molecule 层`,
        suggestion: `请先加载以下 molecule 之一：${parents
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
        cycle: `检测到潜在循环依赖：${skill} 被重复加载`,
      };
    }
    seen.add(skill);
  }
  return { hasCycle: false };
}

// ============================================================================
// 4. 生成 Skill Graph 拓扑提示
// ============================================================================

function generateGraphPrompt(): string {
  let prompt = `\n## Skill Graph 加载规则\n\n`;
  prompt += `你必须严格按照以下层级结构加载 skill，从顶层 compound 开始，逐层向下：\n\n`;

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

  prompt += `### 强制规则\n`;
  prompt += `1. **必须从 compound 开始**：先加载 compound SKILL.md，再按需加载其依赖的 molecule\n`;
  prompt += `2. **不跨层调用**：compound 只调用 molecule，molecule 只调用 atom，atom 不调用任何 skill\n`;
  prompt += `3. **按需加载**：只有在执行到需要某层 skill 的步骤时才 read 对应的 SKILL.md\n`;
  prompt += `4. **禁止循环依赖**：不得重复加载同一个 skill\n\n`;

  const standaloneAtoms = SKILL_GRAPH.filter(
    (s) => s.layer === "atom" && s.standalone
  );
  if (standaloneAtoms.length > 0) {
    prompt += `### Standalone Skills（可独立调用）\n`;
    prompt += `以下 atom 被标记为 standalone，可被子 Agent 直接调用：\n`;
    for (const atom of standaloneAtoms) {
      prompt += `- \`${atom.name}\`\n`;
    }
    prompt += `\n`;
  }

  prompt += `### 加载模板\n`;
  prompt += `1. read compound-xxx/SKILL.md        ← 入口点，了解整体流程\n`;
  prompt += `2. read molecule-yyy/SKILL.md        ← 按需加载当前步骤需要的 molecule\n`;
  prompt += `3. read atom-zzz/SKILL.md            ← molecule 指引你加载需要的 atom\n`;
  prompt += `4. 执行 atom 的操作\n`;
  prompt += `5. 返回 molecule 继续下一步骤\n`;

  return prompt;
}

// ============================================================================
// 5. 扩展注册
// ============================================================================

export default function skillGraphEnforcer(api: ExtensionAPI): void {
  const state = createLoadingState();

  // 每次 Agent 启动前注入 Skill Graph 拓扑
  api.on("before_agent_start", (ctx) => {
    const graphPrompt = generateGraphPrompt();
    ctx.additionalContext = (ctx.additionalContext || "") + graphPrompt;
  });

  // 拦截 read 工具调用，验证层级关系
  api.on("tool_call", (ctx) => {
    if (ctx.toolName !== "read") return;

    const skillName = detectSkillNameFromPath(ctx.args.path || "");
    if (!skillName) return;

    // 循环检测
    const cycleCheck = detectCircularDependency(skillName, state);
    if (cycleCheck.hasCycle) {
      api.showMessage({
        type: "warning",
        text: cycleCheck.cycle!,
      });
      return;
    }

    // 层级验证
    const validation = validateTopDownLoading(skillName, state);
    if (!validation.valid) {
      api.showMessage({
        type: "error",
        text: `${validation.reason}\n${validation.suggestion}`,
      });
      return;
    }

    // 记录加载历史
    state.loadHistory.push({
      skill: skillName,
      timestamp: Date.now(),
      context: "tool_call",
    });
  });

  // read 返回后更新加载状态
  api.on("tool_result", (ctx) => {
    if (ctx.toolName !== "read") return;

    const skillName = detectSkillNameFromPath(ctx.args.path || "");
    if (!skillName) return;

    const node = SKILL_MAP.get(skillName);
    if (!node) return;

    state.loadedSkills.add(skillName);

    // 记录 activeCompound
    if (node.layer === "compound") {
      state.activeCompound = skillName;
    }
  });

  // 会话重置
  api.on("session_start", () => {
    state.loadedSkills.clear();
    state.activeCompound = null;
    state.loadHistory = [];
  });
}
