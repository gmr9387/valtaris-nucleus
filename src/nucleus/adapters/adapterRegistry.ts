// Phase 43 — Adapter Registry

import { weaverEngine } from "../subsystems/weaver/weaverEngine";
import { guardianEngine } from "../subsystems/guardian/guardianEngine";
import { glueEngine } from "../workflows/glueEngine";
import { dualpayEngine } from "../subsystems/dualpay/dualpayEngine";

import { resourceGraph } from "../resources/resourceGraph";
import { lineageEngine } from "../lineage/lineageEngine";
import { telemetryEngine } from "../telemetry/telemetryEngine";

import { environmentActivationEngine } from "../activationEnv/environmentActivationEngine";
import { federationEngine } from "../federation/federationEngine";
import { autonomyEngine } from "../autonomy/autonomyEngine";
import { sovereigntyRuntime } from "../sovereignty/sovereigntyRuntime";
import { legacyAdapterRegistry } from "../adaptersLegacy/legacyAdapterRegistry";

export const adapterRegistry: Record<string, unknown> = {
  "weaver.adapter": weaverEngine,
  "guardian.adapter": guardianEngine,
  "glue.adapter": glueEngine,
  "dualpay.adapter": dualpayEngine,

  "resources.adapter": resourceGraph,
  "lineage.adapter": lineageEngine,
  "telemetry.adapter": telemetryEngine,

  "environment.adapter": environmentActivationEngine,
  "federation.adapter": federationEngine,
  "autonomy.adapter": autonomyEngine,
  "sovereignty.adapter": sovereigntyRuntime,

  // existing constitutional adapters above remain unchanged
  ...legacyAdapterRegistry,
};
