// src/nucleus/runtime/runtimeEngine.ts
// Unified constitutional runtime engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusEventBus, EventRecord } from "../events/eventBus";

export type RuntimeTask = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  handler: (event: EventRecord) => Promise<any> | any;
  createdAt: number;
};

export type RuntimeExecution = {
  id: string;
  taskId: string;
  org: string;
  subsystem: string;
  type: string;
  status: "success" | "error";
  result?: any;
  error?: any;
  timestamp: number;
};

export class RuntimeEngine {
  private tasks: RuntimeTask[] = [];
  private executions: RuntimeExecution[] = [];

  register(
    org: string,
    subsystem: string,
    type: string,
    handler: RuntimeTask["handler"]
  ) {
    const task: RuntimeTask = {
      id: randomUUID(),
      org,
      subsystem,
      type,
      handler,
      createdAt: Date.now(),
    };

    this.tasks.push(task);

    const prefix = `[RUNTIME][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Task registered: ${type}`);

    // Subscribe to event bus
    nucleusEventBus.subscribe(subsystem, type, (event) => {
      this.execute(task, event);
    });

    return task;
  }

  private async execute(task: RuntimeTask, event: EventRecord) {
    const prefix = `[RUNTIME][${task.subsystem.toUpperCase()}]`;

    try {
      const result = await task.handler(event);

      const execution: RuntimeExecution = {
        id: randomUUID(),
        taskId: task.id,
        org: task.org,
        subsystem: task.subsystem,
        type: task.type,
        status: "success",
        result,
        timestamp: Date.now(),
      };

      this.executions.push(execution);

      console.log(prefix, `Executed ${task.type} successfully`);
      return execution;
    } catch (err) {
      const execution: RuntimeExecution = {
        id: randomUUID(),
        taskId: task.id,
        org: task.org,
        subsystem: task.subsystem,
        type: task.type,
        status: "error",
        error: err,
        timestamp: Date.now(),
      };

      this.executions.push(execution);

      console.error(prefix, `Execution error for ${task.type}:`, err);
      return execution;
    }
  }

  getTasks() {
    return [...this.tasks];
  }

  getExecutions() {
    return [...this.executions];
  }

  getExecutionsBySubsystem(subsystem: string) {
    return this.executions.filter((e) => e.subsystem === subsystem);
  }

  clear() {
    this.tasks = [];
    this.executions = [];
  }
}

export const nucleusRuntime = new RuntimeEngine();
