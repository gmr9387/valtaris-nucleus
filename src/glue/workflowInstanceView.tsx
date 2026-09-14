/**
 * Workflow Instance View for the Valtaris Glue runtime.
 * Provides deterministic visualization of workflow instance execution:
 * - instance metadata
 * - step-by-step states
 * - outputs and errors
 * - timestamps
 */

import { useEffect, useState } from "react";
import { WorkflowInstance, WorkflowStepState } from "./workflowInstance";

interface WorkflowInstanceViewProps {
  instanceId: string;
}

export function WorkflowInstanceView(props: WorkflowInstanceViewProps) {
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [steps, setSteps] = useState<WorkflowStepState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // Load instance
        const instRes = await fetch(
          `/workflow/instance/get?instanceId=${props.instanceId}`
        );
        if (!instRes.ok) throw new Error("Failed to load instance");
        const instJson = await instRes.json();

        // Load step states
        const stepRes = await fetch(
          `/workflow/instance/steps?instanceId=${props.instanceId}`
        );
        if (!stepRes.ok) throw new Error("Failed to load step states");
        const stepJson = await stepRes.json();

        if (mounted) {
          setInstance(instJson);
          setSteps(stepJson);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message ?? "Failed to load workflow instance");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [props.instanceId]);

  if (loading) {
    return <div>Loading workflow instance…</div>;
  }

  if (error || !instance) {
    return <div>Error loading instance: {error ?? "Unknown error"}</div>;
  }

  return (
    <div className="workflow-instance-view">
      <h2>Workflow Instance</h2>

      <div className="instance-metadata">
        <p><strong>ID:</strong> {instance.id}</p>
        <p><strong>Status:</strong> {instance.status}</p>
        <p><strong>Version:</strong> {instance.version}</p>
        <p><strong>Created:</strong> {instance.createdAt}</p>
        <p><strong>Started:</strong> {instance.startedAt}</p>
        <p><strong>Completed:</strong> {instance.completedAt ?? "—"}</p>
      </div>

      <h3>Step Execution</h3>

      {steps.map(step => (
        <div key={step.id} className="step-state">
          <h4>Step: {step.stepId}</h4>
          <p><strong>Status:</strong> {step.status}</p>
          <p><strong>Started:</strong> {step.startedAt}</p>
          <p><strong>Completed:</strong> {step.completedAt ?? "—"}</p>

          {step.output && (
            <pre className="step-output">
              {JSON.stringify(step.output, null, 2)}
            </pre>
          )}

          {step.error && (
            <pre className="step-error">
              {JSON.stringify(step.error, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
