// Phase 47 — Sovereign Shell Entrypoint

import readline from "readline";
import { shellManifest } from "./shellManifest";
import { shellRouter } from "./shellRouter";

export function startShell() {
  if (!shellManifest.enabled) {
    throw new Error("Shell disabled by manifest");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: shellManifest.prompt,
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const result = await shellRouter.execute(line);
    console.log(result);

    if (result && "exit" in result && result.exit) {
      rl.close();
      return;
    }

    rl.prompt();
  });
}
