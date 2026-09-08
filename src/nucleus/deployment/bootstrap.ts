// src/nucleus/deployment/bootstrap.ts

import { Constitution } from "../constitution";
import { nucleusBoot } from "../runtime/nucleusBoot";

export class DeploymentBootstrap {
  static start(organizationId: string) {
    console.log("=== Valtaris Nucleus Boot Sequence ===");

    console.log("Constitution:", Constitution.describe());

    // Boot the runtime
    nucleusBoot("nucleus", organizationId);

    console.log("Nucleus runtime initialized.");
  }
}
