// Strict. Aligned. No drift. No overengineering.

import path from "path";
import fs from "fs";
import { AgentManifest } from "./agentManifest";
import { loadAgentManifest } from "./agentLoader";

export type AgentExecutionResult =
  | { status: "success"; output: any }
  | { status: "error"; error: string };

const loadAgentModule = (agentPath: string, moduleName: string) => {
  const modulePath = path.join(agentPath, moduleName);

  if (!fs.existsSync(modulePath)) {
    throw new Error(`Agent module not found: ${modulePath}`);
  }

  return require(modulePath);
};

export const executeAgentCapability = async (params: {
  agentsRoot: string;
  agentFolder: string;
  capabilityName: string;
  input: any;
}): Promise<AgentExecutionResult> => {
  try {
    const agentPath = path.join(params.agentsRoot, params.agentFolder);

    // 1. Load manifest
    const manifest: AgentManifest = loadAgentManifest(agentPath);

    if (!manifest.capabilities.includes(params.capabilityName)) {
      return {
        status: "error",
        error: `Capability '${params.capabilityName}' not found in agent`,
      };
    }

    // 2. Load capability module
    const capabilityModule = loadAgentModule(
      agentPath,
      `capabilities/${params.capabilityName}.js`
    );

    // 3. Execute capability
    const output = await capabilityModule.run(params.input);

    return {
      status: "success",
      output,
    };
  } catch (err: any) {
    return {
      status: "error",
      error: err.message,
    };
  }
};

export const executeAgent = async (params: {
  agentsRoot: string;
  agentFolder: string;
  context: any;
}): Promise<AgentExecutionResult> => {
  try {
    const agentPath = path.join(params.agentsRoot, params.agentFolder);

    // 1. Load manifest
    const manifest: AgentManifest = loadAgentManifest(agentPath);

    // 2. Load main agent module
    const agentModule = loadAgentModule(agentPath, "index.js");

    // 3. Execute agent
    const output = await agentModule.run(params.context);

    return {
      status: "success",
      output,
    };
  } catch (err: any) {
    return {
      status: "error",
      error: err.message,
    };
  }
};
