// Phase 44 — CI Entry Point

import { ciRunner } from "./ciRunner";

export async function runCI() {
  console.log("🔵 Phase 44 — Sovereign CI Starting...");
  const result = await ciRunner.run();
  console.log("🟢 CI complete:", result);
  console.log("🔵 Phase 44 — Sovereign CI Finished.");
  return result;
}

// FIXED: this file only ever defined runCI() -- nothing called it, so
// `npm run ci` loaded the module and exited 0 without running a single
// suite. Invoke it when this file is the actual entrypoint (as opposed
// to being imported by index.ts, which re-exports it for other callers),
// and fail the process on a thrown/rejected suite instead of silently
// succeeding.
const isEntryPoint = import.meta.url === `file://${process.argv[1]}`;
if (isEntryPoint) {
  runCI().catch((err) => {
    console.error("🔴 CI failed:", err);
    process.exitCode = 1;
  });
}
