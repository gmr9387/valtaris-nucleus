/**
 * Workflow Execute Panel for the Valtaris Glue runtime.
 * Provides a full execution panel:
 * - workflow metadata display
 * - execution trigger
 * - integrated instance viewer
 */

import { useState } from "react";
import { WorkflowExecute } from "./workflowExecute";
import { WorkflowInstanceViewContainer } from "./workflowInstanceViewContainer";

interface WorkflowExecutePanelProps {
  workflowId: string;
  workflowName: string;
  activeVersion: number;
  userId: string;
}

export function WorkflowExecutePanel(props: WorkflowExecutePanelProps) {
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function executeWorkflow() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/workflow/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: props.workflowId,
          userId: props.userId
        })
      });

      if (!res.ok) {
        throw new Error(`Execution failed: ${res.status}`);
      }

      const instance = await res.json();
      setInstanceId(instance.id);
    } catch (err: any) {
      setError(err.message ?? "Failed to execute workflow");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="workflow-execute-panel">
      <h2>Execute Workflow</h2>

      <div className="workflow-metadata">
        <p><strong>Name:</strong> {props.workflowName}</p>
        <p><strong>ID:</strong> {props.workflowId}</p>
        <p><strong>Active Version:</strong> {props.activeVersion}</p>
      </div>

      <button onClick={executeWorkflow} disabled={loading}>
        {loading ? "Executing…" : "Run Workflow"}
      </button>

      {error && (
        <div className="execution-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {instanceId && (
        <div className="execution-result">
          <h3>Execution Result</h3>
          <WorkflowInstanceViewContainer instanceId={instanceId} />
        </div>
      )}
    </div>
  );
}
