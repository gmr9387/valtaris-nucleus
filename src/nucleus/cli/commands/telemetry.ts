// src/nucleus/cli/commands/telemetry.ts
// Full file — nucleus telemetry <org>

import { NucleusDBBridge } from "../../db/nucleusDBBridge";

export class TelemetryCommand {
  static async run(args: string[]) {
    const org = args[0];
    if (!org) {
      console.error("Usage: nucleus telemetry <organizationId>");
      return;
    }

    const db = new NucleusDBBridge();
    const client = db.getClient();

    const { data } = await client.from("nucleus_telemetry").select("*").eq("organization_id", org);

    console.log(JSON.stringify(data, null, 2));
  }
}
