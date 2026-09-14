// valtaris-nucleus/src/nucleus/cli/commands/dev.ts

import { startNucleus } from "../../index";

/**
 * CLI Dev Command
 * ----------------
 * Provides a simple CLI entrypoint for local development.
 * Delegates to the canonical Nucleus startup function.
 */

export class DevCommand {
  static async run() {
    console.log("Starting Nucleus in development mode...");
    await startNucleus(process.env.ORGANIZATION_ID || "dev-org");
  }
}
