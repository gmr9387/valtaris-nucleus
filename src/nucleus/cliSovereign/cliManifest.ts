// Phase 46 — CLI Manifest

export interface CLIManifest {
  enabled: boolean;
  commands: string[];
}

export const cliManifest: CLIManifest = {
  enabled: true,
  commands: [
    "start",
    "pipeline",
    "adapters",
    "ci",
    "sovereignty",
    "activation",
    "federation",
    "autonomy",
    "resources",
    "lineage",
    "telemetry",
    // FIXED: "deploy" and "certify" have been real, working
    // cliCommands entries since earlier phases, but were never added
    // here -- CLIRouter.execute() throws "Unknown command" for
    // anything not in this list, so both were unreachable through the
    // actual CLI/shell despite being fully implemented. Found while
    // adding "benchmark" and checking it would actually be reachable.
    "deploy",
    "certify",
    "benchmark",
  ],
};
