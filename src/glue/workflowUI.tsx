/**
 * Unified Workflow UI Shell for the Valtaris Glue runtime.
 * Provides full workflow browsing + execution + instance viewing:
 * - WorkflowListPage (browse workflows)
 * - WorkflowExecutePage (execute workflow)
 * - WorkflowInstanceViewContainer (view execution)
 *
 * This is the top-level UI shell for the Glue workflow subsystem.
 */

import { useState } from "react";
import { WorkflowListPage } from "./workflowListPage";
import { WorkflowExecutePage } from "./workflowExecutePage";
import { WorkflowInstanceViewContainer } from "./workflowInstanceViewContainer";

interface WorkflowUIProps {
  userId: string;
}

export function WorkflowUI(props: WorkflowUIProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  // If an instance is selected, show the instance viewer
  if (selectedInstanceId) {
    return (
      <div className="workflow-ui">
        <h1>Workflow Instance</h1>
        <WorkflowInstanceViewContainer instanceId={selectedInstanceId} />
        <button onClick={() => setSelectedInstanceId(null)}>Back</button>
      </div>
    );
  }

  // If a workflow is selected, show the execution page
  if (selectedWorkflowId) {
    return (
      <div className="workflow-ui">
        <WorkflowExecutePage
          workflowId={selectedWorkflowId}
          userId={props.userId}
        />
        <button onClick={() => setSelectedWorkflowId(null)}>Back</button>
      </div>
    );
  }

  // Default: show workflow list
  return (
    <div className="workflow-ui">
      <WorkflowListPage
        userId={props.userId}
      />
    </div>
  );
}
