/**
 * WorkflowListPage for the Valtaris Glue runtime.
 * Provides a full page-level workflow browsing experience:
 * - loads workflow list
 * - renders WorkflowList
 * - navigates into WorkflowExecutePage
 */

import { useState } from "react";
import { WorkflowList } from "./workflowList";
import { WorkflowExecutePage } from "./workflowExecutePage";

interface WorkflowListPageProps {
  userId: string;
}

export function WorkflowListPage(props: WorkflowListPageProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  if (selectedWorkflowId) {
    return (
      <WorkflowExecutePage
        workflowId={selectedWorkflowId}
        userId={props.userId}
      />
    );
  }

  return (
    <div className="workflow-list-page">
      <h1>Workflows</h1>

      <WorkflowList
        onSelectWorkflow={(workflowId) => setSelectedWorkflowId(workflowId)}
      />
    </div>
  );
}
