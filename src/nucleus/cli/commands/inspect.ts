// src/nucleus/cli/commands/inspect.ts
// Full file — nucleus inspect <org>

import { NucleusDBBridge } from "../../db/nucleusDBBridge";

export class InspectCommand {
  static async run(args: string[]) {
    const org = args[0];
    if (!org) {
      console.error("Usage: nucleus inspect <organizationId>");
      return;
    }

    const db = new NucleusDBBridge();
    const client = db.getClient();

    const { data: events } = await client
      .from("nucleus_events")
      .select("*")
      .eq("organization_id", org);

    console.log(JSON.stringify(events, null, 2));
  }
}
