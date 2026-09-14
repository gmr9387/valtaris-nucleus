// Phase 46 — CLI Router

import { cliManifest } from "./cliManifest";
import { cliCommands } from "./cliCommands";
import { cliState } from "./cliState";
import type { Dynamic } from "../types/dynamic";

export class CLIRouter {
  async execute(command: string) {
    if (!cliManifest.enabled) {
      throw new Error("CLI disabled by manifest");
    }

    if (!cliManifest.commands.includes(command)) {
      throw new Error(`Unknown command: ${command}`);
    }

    const fn = (cliCommands as Dynamic)[command];
    const result = await fn();

    cliState.lastCommand = command;
    cliState.lastExecutedAt = new Date().toISOString();

    return {
      command,
      result,
      lastExecutedAt: cliState.lastExecutedAt,
    };
  }
}

export const cliRouter = new CLIRouter();
