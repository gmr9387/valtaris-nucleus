// Phase 47 — Shell Commands

import { nucleus } from "../cliSovereign/nucleus";
import { cliManifest } from "../cliSovereign/cliManifest";

export const shellCommands = {
  help: () => ({
    // FIXED: stale -- missing "deploy"/"certify" (real cliCommands
    // entries that were also missing from cliManifest.ts's allowlist,
    // fixed alongside this) and the new "benchmark" command. This list
    // should track cliManifest.commands.
    commands: [...cliManifest.commands, "exit"],
  }),

  exit: () => ({ exit: true }),

  // Everything else routes to the CLI
  "*": async (cmd: string) => nucleus(cmd),
};
