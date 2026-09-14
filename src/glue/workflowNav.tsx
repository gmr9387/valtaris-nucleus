/**
 * Workflow Navigation Bar for the Valtaris Glue runtime.
 * Provides deterministic navigation between:
 * - Workflow List
 * - Workflow Execution
 * - Workflow Instance Viewer
 *
 * Works together with WorkflowUI (Swap 61).
 */

import { WorkflowUI } from "./workflowUI";
import { useState } from "react";

interface WorkflowNavProps {
  userId: string;
}

export function WorkflowNav(props: WorkflowNavProps) {
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
    <div className="workflow-nav-shell">
      <nav className="workflow-nav">
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

      <div className="workflow-nav-content">
        <WorkflowUI userId={props.userId} />
      </div>
    </div>
  );
}
