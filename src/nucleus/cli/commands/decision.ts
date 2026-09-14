// src/nucleus/cli/commands/decision.ts
// Full file — nucleus decision <context.json>

import fs from "node:fs";
import { DecisionEngine } from "../../decision/engine";

export class DecisionCommand {
  static async run(args: string[]) {
    const file = args[0];
    if (!file) {
      console.error("Usage: nucleus decision <context.json>");
      return;
    }

    const raw = fs.readFileSync(file, "utf-8");
    const context = JSON.parse(raw);

    const engine = new DecisionEngine(context.organizationId, context.subsystem);

    const result = engine.evaluate(context);
    console.log(JSON.stringify(result, null, 2));
  }
}
