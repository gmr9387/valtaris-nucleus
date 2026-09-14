/**
 * Full Workflow Application Shell for the Valtaris Glue runtime.
 * Provides the complete workflow experience:
 * - navigation bar (Swap 62)
 * - unified workflow UI (Swap 61)
 * - deterministic routing + state transitions
 *
 * This is the top-level component for the Glue workflow subsystem.
 */

import { useState } from "react";
import { WorkflowListPage } from "./workflowListPage";
import { WorkflowExecutePage } from "./workflowExecutePage";
import { WorkflowInstanceViewContainer } from "./workflowInstanceViewContainer";

interface WorkflowShellProps {
  userId: string;
}

export function WorkflowShell(props: WorkflowShellProps) {
  const [view, setView] = useState<"list" | "execute" | "instance">("list");
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);

  function goList() {
    setView("list");
    setWorkflowId(null);
    setInstanceId(null);
  }

  function goExecute(id: string) {
    setWorkflowId(id);
    setView("execute");
  }

  function goInstance(id: string) {
    setInstanceId(id);
    setView("instance");
  }

  return (
    <div className="workflow-shell">
      <nav className="workflow-shell-nav">
        <button onClick={goList}>Workflows</button>

        {workflowId && (
          <button onClick={() => goExecute(workflowId)}>
            Execute Workflow
          </button>
        )}

        {instanceId && (
          <button onClick={() => goInstance(instanceId)}>
            View Instance
          </button>
        )}
      </nav>

      <div className="workflow-shell-content">
        {view === "list" && (
          <WorkflowListPage
            userId={props.userId}
          />
        )}

        {view === "execute" && workflowId && (
          <WorkflowExecutePage
            workflowId={workflowId}
            userId={props.userId}
          />
        )}

        {view === "instance" && instanceId && (
          <WorkflowInstanceViewContainer instanceId={instanceId} />
        )}
      </div>
    </div>
  );
}
