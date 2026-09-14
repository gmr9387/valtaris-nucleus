/**
 * Workflow Execute UI for the Valtaris Glue runtime.
 * Provides deterministic workflow execution:
 * - execute workflow via POST /workflow/execute
 * - display resulting instance
 * - render WorkflowInstanceViewContainer
 */

import { useState } from "react";
import { WorkflowInstanceViewContainer } from "./workflowInstanceViewContainer";

interface WorkflowExecuteProps {
  workflowId: string;
  userId: string;
}

export function WorkflowExecute(props: WorkflowExecuteProps) {
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
    <div className="workflow-execute">
      <h2>Execute Workflow</h2>

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
