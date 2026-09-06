// src/nucleus/federation/federationEngine.ts
// Unified constitutional federation engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type FederationNode = {
  id: string;
  name: string;
  region: string;
  url: string;
  metadata?: any;
  createdAt: number;
};

export type FederationLink = {
  id: string;
  sourceNode: string;
  targetNode: string;
  type: "replication" | "sync" | "event-forward" | "state-share";
  createdAt: number;
};

export type FederationEvent = {
  id: string;
  sourceNode: string;
  targetNode: string;
  type: string;
  payload: any;
  timestamp: number;
};

export class FederationEngine {
  private nodes: Map<string, FederationNode> = new Map();
  private links: Map<string, FederationLink> = new Map();
  private events: FederationEvent[] = [];

  registerNode(name: string, region: string, url: string, metadata?: any) {
    const id = randomUUID();

    const node: FederationNode = {
      id,
      name,
      region,
      url,
      metadata,
      createdAt: Date.now(),
    };

    this.nodes.set(id, node);

    console.log(`[FED][NODE] Registered node: ${name} (${region})`);

    return node;
  }

  linkNodes(
    sourceNode: string,
    targetNode: string,
    type: FederationLink["type"]
  ) {
    const id = randomUUID();

    const link: FederationLink = {
      id,
      sourceNode,
      targetNode,
      type,
      createdAt: Date.now(),
    };

    this.links.set(id, link);

    console.log(`[FED][LINK] ${sourceNode} → ${targetNode} (${type})`);

    return link;
  }

  forwardEvent(
    sourceNode: string,
    targetNode: string,
    type: string,
    payload: any
  ) {
    const event: FederationEvent = {
      id: randomUUID(),
      sourceNode,
      targetNode,
      type,
      payload,
      timestamp: Date.now(),
    };

    this.events.push(event);

    console.log(`[FED][EVENT] ${sourceNode} → ${targetNode}: ${type}`);

    // Audit
    nucleusAudit.log(
      "federation",
      "federation",
      `federation.event.${type}`,
      "federation-engine",
      { sourceNode, targetNode, payload }
    );

    // Billing (federation events cost money)
    nucleusBilling.recordEvent(
      "federation",
      "federation",
      `federation.event.${type}`,
      1,
      0.004, // $0.004 per federated event
      { sourceNode, targetNode }
    );

    return event;
  }

  getNodes() {
    return [...this.nodes.values()];
  }

  getLinks() {
    return [...this.links.values()];
  }

  getEvents() {
    return [...this.events];
  }

  clear() {
    this.nodes.clear();
    this.links.clear();
    this.events = [];
  }
}

export const nucleusFederation = new FederationEngine();
