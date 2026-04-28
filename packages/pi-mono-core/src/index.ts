export interface Tool {
  name: string;
  description: string;
  execute(args: any): Promise<any>;
}

export interface AgentStep {
  thought: string;
  action?: string;
  result?: string;
  error?: string;
}

export interface AgentOptions {
  tools: Tool[];
  onStep?: (step: AgentStep) => void;
}

export abstract class Agent {
  constructor(protected options: AgentOptions) {}
  abstract run(prompt: string): Promise<string>;
}

export class CodingAgent extends Agent {
  async run(prompt: string): Promise<string> {
    if (this.options.onStep) {
      this.options.onStep({
        thought: `Thinking about your request: ${prompt}`,
      });

      // Simulate tool usage
      const shellTool = this.options.tools.find((t) => t.name === "shell");
      if (shellTool) {
        this.options.onStep({
          thought: "Checking current directory...",
          action: "shell: ls",
        });
        const result = await shellTool.execute({ command: "ls" });
        this.options.onStep({
          thought: "I see the files.",
          result: JSON.stringify(result),
        });
      }
    }

    return `Completed task: ${prompt}`;
  }
}
