// src/nucleus/workflows/nucleusWorkflowAdapter.ts

import { NucleusApi } from "../api/nucleusApi";

export class NucleusWorkflowAdapter {
  constructor(
    private organizationId: string,
    private supabaseUrl: string,
    private supabaseAnonKey: string
  ) {}

  async handleWorkflowEvent(event: {
    type: string;
    version: string;
    payload: any;
  }) {
    const subsystem = this.mapSubsystem(event.type);
    const api = new NucleusApi(subsystem, this.organizationId);

    api.emit(event.type as Parameters<NucleusApi["emit"]>[0], event.version, event.payload);

    return {
      subsystem,
      event,
    };
  }

  private mapSubsystem(type: string) {
    switch (type) {
      case "opportunity":
      case "recommendation":
        return "weaver";
      case "authorization":
        return "guardian";
      case "execution":
        return "glue";
      case "payment":
        return "dualpay";
      default:
        throw new Error(`Unknown workflow event type: ${type}`);
    }
  }
}
