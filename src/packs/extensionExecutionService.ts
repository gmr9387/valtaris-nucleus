// Strict. Aligned. No drift. No overengineering.

import path from "path";
import fs from "fs";
import { ExtensionManifest } from "./extensionManifest";
import { loadExtensionManifest } from "./extensionLoader";

export type ExtensionExecutionResult =
  | { status: "success"; output: any }
  | { status: "error"; error: string };

const loadExtensionModule = (extensionPath: string, moduleName: string) => {
  const modulePath = path.join(extensionPath, moduleName);

  if (!fs.existsSync(modulePath)) {
    throw new Error(`Extension module not found: ${modulePath}`);
  }

  return require(modulePath);
};

export const executeExtensionTrigger = async (params: {
  extensionsRoot: string;
  extensionFolder: string;
  triggerName: string;
  context: any;
}): Promise<ExtensionExecutionResult> => {
  try {
    const extensionPath = path.join(params.extensionsRoot, params.extensionFolder);

    // 1. Load manifest
    const manifest: ExtensionManifest = loadExtensionManifest(extensionPath);

    if (!manifest.triggers.includes(params.triggerName)) {
      return {
        status: "error",
        error: `Trigger '${params.triggerName}' not found in extension`,
      };
    }

    // 2. Load trigger module
    const triggerModule = loadExtensionModule(
      extensionPath,
      `triggers/${params.triggerName}.js`
    );

    // 3. Execute trigger
    const output = await triggerModule.run(params.context);

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

export const executeExtension = async (params: {
  extensionsRoot: string;
  extensionFolder: string;
  extensionName: string;
  context: any;
}): Promise<ExtensionExecutionResult> => {
  try {
    const extensionPath = path.join(params.extensionsRoot, params.extensionFolder);

    // 1. Load manifest
    const manifest: ExtensionManifest = loadExtensionManifest(extensionPath);

    if (manifest.extension_name !== params.extensionName) {
      return {
        status: "error",
        error: `Extension '${params.extensionName}' does not match manifest`,
      };
    }

    // 2. Load main extension module
    const extensionModule = loadExtensionModule(extensionPath, "index.js");

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
