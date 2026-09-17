// Phase 44 — CI Manifest

export interface CIManifest {
  enabled: boolean;
  suites: string[];
}

export const ciManifest: CIManifest = {
  enabled: true,
  suites: [
    "constitution.tests",
    "sovereignty.tests",
    "activation.tests",
    "federation.tests",
    "autonomy.tests",
    "pipeline.tests",
    "adapters.tests",
    // dispatch.tests moved here, before resources/lineage/telemetry --
    // it runs one real claim through the full pipeline, and
    // lineage.tests/telemetry.tests (see ciSuites.ts) read whatever
    // real dispatch has produced so far in this process. Running it
    // last (its position before this change) meant those two suites
    // always reported empty, regardless of whether the wiring behind
    // them worked -- a vacuous pass, not a real one.
    "dispatch.tests",
    // sandbox.tests runs right after dispatch.tests so GovernanceSandbox
    // has real decisions (not an empty array) to replay against.
    "sandbox.tests",
    "resources.tests",
    "lineage.tests",
    "telemetry.tests",
    "audit.tests",
  ],
};
