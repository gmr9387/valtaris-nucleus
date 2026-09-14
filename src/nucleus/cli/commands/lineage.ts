// src/nucleus/cli/commands/lineage.ts
// Full file — nucleus lineage <org>

import { NucleusDBBridge } from "../../db/nucleusDBBridge";

export class LineageCommand {
  static async run(args: string[]) {
    const org = args[0];
    if (!org) {
      console.error("Usage: nucleus lineage <organizationId>");
      return;
    }

    const db = new NucleusDBBridge();
    const client = db.getClient();

    const { data } = await client.from("nucleus_lineage").select("*").eq("organization_id", org);

    console.log(JSON.stringify(data, null, 2));
  }
}
