/**
 * Workflow Execute Page for the Valtaris Glue runtime.
 * Provides a full page-level execution experience:
 * - loads workflow metadata
 * - renders WorkflowExecutePanel
 * - integrates deterministic runtime + instance viewer
 */

import { useEffect, useState } from "react";
import { WorkflowExecutePanel } from "./workflowExecutePanel";

interface WorkflowExecutePageProps {
  workflowId: string;
  userId: string;
}

interface WorkflowMetadata {
  id: string;
  name: string;
  activeVersion: number;
}

export function WorkflowExecutePage(props: WorkflowExecutePageProps) {
  const [metadata, setMetadata] = useState<WorkflowMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/workflow/get?id=${props.workflowId}`);
        if (!res.ok) throw new Error("Failed to load workflow metadata");

        const json = await res.json();

        if (mounted) {
          setMetadata({
            id: json.id,
            name: json.name,
            activeVersion: json.activeVersion
          });
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message ?? "Failed to load workflow metadata");
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
  }, [props.workflowId]);

  if (loading) {
    return <div>Loading workflow…</div>;
  }

  if (error || !metadata) {
    return <div>Error loading workflow: {error ?? "Unknown error"}</div>;
  }

  return (
    <div className="workflow-execute-page">
      <h1>Workflow Execution</h1>

      <WorkflowExecutePanel
        workflowId={metadata.id}
        workflowName={metadata.name}
        activeVersion={metadata.activeVersion}
        userId={props.userId}
      />
    </div>
  );
}
