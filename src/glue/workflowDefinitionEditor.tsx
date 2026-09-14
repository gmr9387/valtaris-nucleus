/**
 * workflowDefinitionEditor.tsx
 *
 * Top-level Workflow Definition Editor component.
 *
 * Responsibilities:
 * - wrap controller (Swap 81)
 * - render main view (Swap 83)
 * - act as public entrypoint for definition editor UI
 */

import { WorkflowDefinitionController } from "./workflowDefinitionController";
import { WorkflowDefinitionView } from "./workflowDefinitionView";

interface WorkflowDefinitionEditorProps {
  workflowId: string;
}

export function WorkflowDefinitionEditor(props: WorkflowDefinitionEditorProps) {
  const { workflowId } = props;

  return (
    <WorkflowDefinitionController workflowId={workflowId}>
      <WorkflowDefinitionView />
    </WorkflowDefinitionController>
  );
}
