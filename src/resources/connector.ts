/**
 * Connector resource contracts for the Valtaris ecosystem.
 * These contracts define connector structure, configuration,
 * metadata, and events used across the control plane.
 */

export interface Connector {
  id: string;
  organizationId: string;
  projectId: string;
  environmentId: string;
  name: string;
  description: string;
  type: string; // http, x12, sql, custom
  version: number;
  createdAt: string;
  createdBy: string;
  metadata: Record<string, unknown>;
}

export interface ConnectorConfig {
  id: string;
  connectorId: string;
  key: string;
  value: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface ConnectorBinding {
  id: string;
  connectorId: string;
  credentialId: string;
  scope: "organization" | "project" | "environment";
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface ConnectorEvent {
  id: string;
  connectorId: string;
  type:
    | "created"
    | "updated"
    | "config_added"
    | "config_removed"
    | "binding_added"
    | "binding_removed"
    | "error";
  timestamp: string;
  metadata: Record<string, unknown>;
}
