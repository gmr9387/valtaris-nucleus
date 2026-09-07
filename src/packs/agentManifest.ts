// Strict. Aligned. No drift. No overengineering.

export type AgentManifest = {
  agent_id: string;
  agent_name: string;
  agent_version: string;
  agent_description: string;
  capabilities: string[];
  inputs: Record<string, string>;
};

export const validateAgentManifest = (manifest: AgentManifest) => {
  if (!manifest.agent_id) throw new Error("agent_id missing");
  if (!manifest.agent_name) throw new Error("agent_name missing");
  if (!manifest.agent_version) throw new Error("agent_version missing");

  if (!Array.isArray(manifest.capabilities)) {
    throw new Error("capabilities must be array");
  }

  if (typeof manifest.inputs !== "object") {
    throw new Error("inputs must be an object");
  }

  return true;
};
