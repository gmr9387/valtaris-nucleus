// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "../federation/federationClient";

export type MarketplaceItem = {
  type: "pack" | "extension" | "agent" | "workflow";
  id: string;
  name: string;
  version: string;
  description?: string;
  installed: boolean;
};

export const discoverPacks = async (): Promise<MarketplaceItem[]> => {
  const { data, error } = await supabaseFederation
    .from("pack_registry")
    .select("*");

  if (error) {
    throw new Error(`Failed to discover packs: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    type: "pack",
    id: row.pack_id,
    name: row.pack_name,
    version: row.pack_version,
    description: row.pack_description,
    installed: row.installed,
  }));
};

export const discoverExtensions = async (): Promise<MarketplaceItem[]> => {
  const { data, error } = await supabaseFederation
    .from("extension_registry")
    .select("*");

  if (error) {
    throw new Error(`Failed to discover extensions: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    type: "extension",
    id: row.extension_id,
    name: row.extension_name,
    version: row.extension_version,
    description: row.extension_description,
    installed: row.installed,
  }));
};

// Agent + workflow discovery are filesystem-based for now.
// This is scaffolding — enough to power a basic marketplace UI.

import fs from "fs";
import path from "path";
import { loadAllAgents } from "./agentLoader";
import { loadAllWorkflows } from "./workflowLoader";

export const discoverAgents = (agentsRoot: string): MarketplaceItem[] => {
  if (!fs.existsSync(agentsRoot)) return [];

  const agents = loadAllAgents(agentsRoot);

  return agents.map((agent) => ({
    type: "agent",
    id: agent.agent_id,
    name: agent.agent_name,
    version: agent.agent_version,
    description: agent.agent_description,
    installed: true, // filesystem presence = installed
  }));
};

export const discoverWorkflows = (workflowsRoot: string): MarketplaceItem[] => {
  if (!fs.existsSync(workflowsRoot)) return [];

  const workflows = loadAllWorkflows(workflowsRoot);

  return workflows.map((workflow) => ({
    type: "workflow",
    id: workflow.workflow_id,
    name: workflow.workflow_name,
    version: workflow.workflow_version,
    description: workflow.workflow_description,
    installed: true, // filesystem presence = installed
  }));
};

export const discoverAllMarketplaceItems = async (params: {
  agentsRoot: string;
  workflowsRoot: string;
}): Promise<MarketplaceItem[]> => {
  const [packs, extensions] = await Promise.all([
    discoverPacks(),
    discoverExtensions(),
  ]);

  const agents = discoverAgents(params.agentsRoot);
  const workflows = discoverWorkflows(params.workflowsRoot);

  return [...packs, ...extensions, ...agents, ...workflows];
};
