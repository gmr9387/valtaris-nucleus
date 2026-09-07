// Strict. Aligned. No drift. No overengineering.

import path from "path";
import fs from "fs";
import { PackManifest } from "./packManifest";
import { loadPackManifest } from "./packLoader";

export type PackExecutionResult =
  | { status: "success"; output: any }
  | { status: "error"; error: string };

const loadPackModule = (packPath: string, moduleName: string) => {
  const modulePath = path.join(packPath, moduleName);

  if (!fs.existsSync(modulePath)) {
    throw new Error(`Pack module not found: ${modulePath}`);
  }

  return require(modulePath);
};

export const executePackCapability = async (params: {
  packsRoot: string;
  packFolder: string;
  capabilityName: string;
  input: any;
}): Promise<PackExecutionResult> => {
  try {
    const packPath = path.join(params.packsRoot, params.packFolder);

    // 1. Load manifest
    const manifest: PackManifest = loadPackManifest(packPath);

    if (!manifest.capabilities.includes(params.capabilityName)) {
      return {
        status: "error",
        error: `Capability '${params.capabilityName}' not found in pack`,
      };
    }

    // 2. Load capability module
    const capabilityModule = loadPackModule(
      packPath,
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

export const executePackWorkflow = async (params: {
  packsRoot: string;
  packFolder: string;
  workflowName: string;
  input: any;
}): Promise<PackExecutionResult> => {
  try {
    const packPath = path.join(params.packsRoot, params.packFolder);

    // 1. Load manifest
    const manifest: PackManifest = loadPackManifest(packPath);

    if (!manifest.workflows.includes(params.workflowName)) {
      return {
        status: "error",
        error: `Workflow '${params.workflowName}' not found in pack`,
      };
    }

    // 2. Load workflow module
    const workflowModule = loadPackModule(
      packPath,
      `workflows/${params.workflowName}.js`
    );

    // 3. Execute workflow
    const output = await workflowModule.run(params.input);

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

export const executePackExtension = async (params: {
  packsRoot: string;
  packFolder: string;
  extensionName: string;
  context: any;
}): Promise<PackExecutionResult> => {
  try {
    const packPath = path.join(params.packsRoot, params.packFolder);

    // 1. Load manifest
    const manifest: PackManifest = loadPackManifest(packPath);

    if (!manifest.extensions.includes(params.extensionName)) {
      return {
        status: "error",
        error: `Extension '${params.extensionName}' not found in pack`,
      };
    }

    // 2. Load extension module
    const extensionModule = loadPackModule(
      packPath,
      `extensions/${params.extensionName}.js`
    );

    // 3. Execute extension
    const output = await extensionModule.run(params.context);

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
