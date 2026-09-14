/**
 * WorkflowList for the Valtaris Glue runtime.
 * Provides a deterministic list of workflows:
 * - loads workflow metadata via WorkflowExecuteClient
 * - displays workflow name, version, and IDs
 * - links into WorkflowExecutePage
 */

import { useEffect, useState } from "react";
import { WorkflowExecuteClient, WorkflowMetadata } from "./workflowExecuteClient";

interface WorkflowListProps {
  onSelectWorkflow: (workflowId: string) => void;
}

export function WorkflowList(props: WorkflowListProps) {
  const [workflows, setWorkflows] = useState<WorkflowMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const client = new WorkflowExecuteClient();

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const list = await client.listWorkflows();
        if (mounted) {
          setWorkflows(list);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message ?? "Failed to load workflows");
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
  }, []);

  if (loading) {
    return <div>Loading workflows…</div>;
  }

  if (error) {
    return <div>Error loading workflows: {error}</div>;
  }

  return (
    <div className="workflow-list">
      <h2>Workflows</h2>

      {workflows.length === 0 && <div>No workflows found.</div>}

      <ul>
        {workflows.map(wf => (
          <li key={wf.id} className="workflow-list-item">
            <div>
              <strong>{wf.name}</strong>
              <div>ID: {wf.id}</div>
              <div>Version: {wf.activeVersion}</div>
            </div>

            <button onClick={() => props.onSelectWorkflow(wf.id)}>
              Execute
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
