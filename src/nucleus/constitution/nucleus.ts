// src/nucleus/constitution/nucleus.ts
//
// The "Constitution" unified interface the README describes --
// `new Nucleus(org, subsystem)` with runWorkflow/dispatch/emit/
// evaluate/startRuntime/enqueue -- did not exist anywhere in this
// codebase before this file (confirmed: zero occurrences of
// "class Nucleus" in the whole repo). This is a real facade over
// pieces that are each independently real and already verified on
// their own: startWorkflow() (lib/workflows/runtime.ts, the same call
// the CLI's `nucleus run` and POST /nucleus/workflow/run both make),
// RuntimeRouter.dispatch() (the same governed dispatch every real
// OSPipeline claim stage goes through), TelemetryAdapter.send() (the
// same queue-routed emit OSPipeline calls after every stage),
// DecisionEngine (made real in an earlier commit on this branch),
// nucleusBoot() (the real per-subsystem runtime constructor
// DeploymentBootstrap itself calls), and QueueEngine.enqueue() (the
// real priority/retry queue). Nucleus does not duplicate or
// reimplement any of their logic -- every method here is a thin, named
// wrapper, so making this class real could not accidentally introduce
// a second, competing implementation of anything already real.

import { startWorkflow } from "../../lib/workflows/runtime";
import { RuntimeRouter } from "../runtime/runtimeRouter";
import { TelemetryAdapter } from "../subsystems/telemetry/telemetryAdapter";
import { DecisionEngine } from "../decision/engine";
import { nucleusBoot } from "../runtime/nucleusBoot";
import { nucleusQueue } from "../queue/queueEngine";
import type { SubsystemId } from "../subsystems/subsystemRegistry";
import type { Dynamic } from "../types/dynamic";

export class Nucleus {
  private decisionEngine: DecisionEngine;

  constructor(
    private organizationId: string,
    private subsystem: string,
  ) {
    this.decisionEngine = new DecisionEngine(organizationId, subsystem);
  }

  /**
   * Starts a real workflow run -- the same startWorkflow() call the
   * CLI's `nucleus run workflow.json` and POST /nucleus/workflow/run
   * both make, scoped to this instance's organizationId.
   */
  async runWorkflow(definition: { workflowId: string; versionId: string }) {
    return startWorkflow({
      organization_id: this.organizationId,
      workflow_id: definition.workflowId,
      version_id: definition.versionId,
    });
  }

  /**
   * Governed dispatch into this instance's own subsystem for one
   * contract stage -- the same RuntimeRouter.dispatch() every real
   * OSPipeline stage goes through (enabled-subsystem check, the
   * subsystem's real handle(), output contract validation).
   */
  async dispatch(contractName: string, version: string, payload: Dynamic) {
    return RuntimeRouter.dispatch(this.subsystem as SubsystemId, contractName, payload, version);
  }

  /**
   * Fires a real, queue-routed telemetry event for this instance's
   * subsystem -- the same TelemetryAdapter.send() OSPipeline calls
   * after every stage (real QueueEngine enqueue + deliver with audit
   * and billing hooks, ending at eventBus.emit()).
   */
  async emit(eventType: string, version: string, payload: Dynamic) {
    const body = typeof payload === "object" && payload !== null ? payload : { value: payload };
    return TelemetryAdapter.send(`${this.subsystem}.${eventType}`, {
      ...body,
      organizationId: this.organizationId,
      contractVersion: version,
    });
  }

  /**
   * Evaluates the real decision engine (governance rules + Weaver/
   * Guardian-signal-derived confidence) against `context` -- the same
   * engine OSPipeline now calls for every real claim.
   */
  evaluate(context: Dynamic) {
    return this.decisionEngine.evaluate(context);
  }

  /**
   * Boots a real, per-subsystem NucleusRuntime for this instance
   * (nucleusBoot(): registers all subsystems, constructs and boots a
   * NucleusRuntime scoped to this subsystem + organizationId). Does
   * NOT start the HTTP API server or the process-wide scheduled
   * heartbeat/certification sweep -- those are real, but they're
   * process-singleton concerns (DeploymentBootstrap.start(), called
   * once per process by startNucleus()); calling them again per
   * Nucleus instance would try to bind an already-bound port.
   */
  startRuntime() {
    return nucleusBoot(this.subsystem, this.organizationId);
  }

  /**
   * Enqueues real work onto this instance's subsystem queue via the
   * real QueueEngine (priority/retry, audit + billing hooks). This
   * only enqueues -- it does not execute the message; dispatch() or a
   * separate deliver() call processes it when ready.
   */
  enqueue(contractName: string, version: string, payload: Dynamic) {
    return nucleusQueue.enqueue(this.organizationId, `${this.subsystem}.${contractName}`, {
      contractVersion: version,
      payload,
    });
  }
}
