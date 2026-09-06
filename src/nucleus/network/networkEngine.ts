// src/nucleus/network/networkEngine.ts
// Unified constitutional network engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type NetworkMessage = {
  id: string;
  org: string;
  source: string;
  target: string;
  action: string;
  payload: any;
  timestamp: number;
};

export class NetworkEngine {
  private messages: NetworkMessage[] = [];

  send(org: string, source: string, target: string, action: string, payload: any) {
    const msg: NetworkMessage = {
      id: randomUUID(),
      org,
      source,
      target,
      action,
      payload,
      timestamp: Date.now(),
    };

    this.messages.push(msg);

    console.log(`[NETWORK] ${source} → ${target}: ${action}`);

    nucleusAudit.log(org, target, `network.${action}`, "network-engine", { source, payload });
    nucleusBilling.recordEvent(org, target, `network.${action}`, 1, 0.0025, { source });

    return msg;
  }

  getMessages(org?: string, source?: string, target?: string) {
    return this.messages.filter((m) => {
      if (org && m.org !== org) return false;
      if (source && m.source !== source) return false;
      if (target && m.target !== target) return false;
      return true;
    });
  }

  clear() {
    this.messages = [];
  }
}

export const nucleusNetwork = new NetworkEngine();
