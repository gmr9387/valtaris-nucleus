// src/nucleus/cluster/clusterEngine.ts
// Unified constitutional cluster engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type ClusterNode = {
  id: string;
  name: string;
  role: "worker" | "controller" | "scheduler";
  status: "online" | "offline";
  metadata?: any;
  createdAt: number;
};

export type ClusterTaskAssignment = {
  id: string;
  nodeId: string;
  taskType: string;
  payload: any;
  timestamp: number;
};

export type ClusterHeartbeat = {
  id: string;
  nodeId: string;
  status: "online" | "offline";
  timestamp: number;
};

export class ClusterEngine {
  private nodes: Map<string, ClusterNode> = new Map();
  private assignments: ClusterTaskAssignment[] = [];
  private heartbeats: ClusterHeartbeat[] = [];

  registerNode(
    name: string,
    role: ClusterNode["role"],
    metadata?: any
  ) {
    const id = randomUUID();

    const node: ClusterNode = {
      id,
      name,
      role,
      status: "online",
      metadata,
      createdAt: Date.now(),
    };

    this.nodes.set(id, node);

    console.log(`[CLUSTER][NODE] Registered: ${name} (${role})`);

    return node;
  }

  updateNodeStatus(nodeId: string, status: ClusterNode["status"]) {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    node.status = status;

    const heartbeat: ClusterHeartbeat = {
      id: randomUUID(),
      nodeId,
      status,
      timestamp: Date.now(),
    };

    this.heartbeats.push(heartbeat);

    console.log(`[CLUSTER][HEARTBEAT] ${node.name} → ${status}`);

    // Audit
    nucleusAudit.log(
      "cluster",
      "cluster",
      `cluster.node.${node.name}.status`,
      "cluster-engine",
      { status }
    );

    // Billing (cluster heartbeat costs money)
    nucleusBilling.recordEvent(
      "cluster",
      "cluster",
      `cluster.node.${node.name}.heartbeat`,
      1,
      0.001, // $0.001 per heartbeat
      { status }
    );

    return heartbeat;
  }

  assignTask(nodeId: string, taskType: string, payload: any) {
    const node = this.nodes.get(nodeId);
    if (!node || node.status !== "online") {
      console.error(`[CLUSTER] Cannot assign task: node offline or missing`);
      return null;
    }

    const assignment: ClusterTaskAssignment = {
      id: randomUUID(),
      nodeId,
      taskType,
      payload,
      timestamp: Date.now(),
    };

    this.assignments.push(assignment);

    console.log(`[CLUSTER][TASK] ${node.name} assigned: ${taskType}`);

    // Audit
    nucleusAudit.log(
      "cluster",
      "cluster",
      `cluster.task.${taskType}`,
      "cluster-engine",
      { node: node.name, payload }
    );

    // Billing (task assignment costs money)
    nucleusBilling.recordEvent(
      "cluster",
      "cluster",
      `cluster.task.${taskType}`,
      1,
      0.003, // $0.003 per task assignment
      { node: node.name }
    );

    return assignment;
  }

  getNodes() {
    return [...this.nodes.values()];
  }

  getAssignments() {
    return [...this.assignments];
  }

  getHeartbeats() {
    return [...this.heartbeats];
  }

  clear() {
    this.nodes.clear();
    this.assignments = [];
    this.heartbeats = [];
  }
}

export const nucleusCluster = new ClusterEngine();
