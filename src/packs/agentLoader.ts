// Strict. Aligned. No drift. No overengineering.

import fs from "fs";
import path from "path";
import { AgentManifest, validateAgentManifest } from "./agentManifest";

export const loadAgentManifest = (agentPath: string): AgentManifest => {
  const manifestPath = path.join(agentPath, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Agent manifest not found at ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(raw);

  validateAgentManifest(manifest);

  return manifest;
};

export const loadAllAgents = (agentsRoot: string): AgentManifest[] => {
  const dirs = fs.readdirSync(agentsRoot, { withFileTypes: true });

  const agents: AgentManifest[] = [];

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const agentPath = path.join(agentsRoot, dir.name);

    try {
      const manifest = loadAgentManifest(agentPath);
      agents.push(manifest);
    } catch (err) {
      console.error(`Failed to load agent ${dir.name}:`, err);
    }
  }

  return agents;
};
