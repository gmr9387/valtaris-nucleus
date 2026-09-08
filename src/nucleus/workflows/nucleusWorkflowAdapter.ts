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
    // NOTE: This currently only binds routes; it does not yet emit events.
    // Constitutional routing for workflow events is NOT wired here yet.
    const app = {}; // placeholder for the real Express/Bun app instance
    const api = new NucleusApi(app, this.organizationId);

    // TODO: Once NucleusApi exposes an event emission surface,
    // route `event` into that surface here.

    return {
      subsystem: this.mapSubsystem(event.type),
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
