/**
 * workflowDefinitionView.tsx
 *
 * Main UI view for the Workflow Definition Editor.
 *
 * Responsibilities:
 * - bind editor context state to UI
 * - render layout shell (sidebar + toolbar + main panel)
 * - show validation status + dirty indicator
 * - integrate step list + step editor
 */

import { useWorkflowDefinitionEditor } from "./workflowDefinitionContext";

import { WorkflowDefinitionSidebar } from "./workflowDefinitionSidebar";
import { WorkflowDefinitionToolbar } from "./workflowDefinitionToolbar";
import { WorkflowDefinitionStepEditor } from "./workflowDefinitionStepEditor";

export function WorkflowDefinitionView() {
  const {
    definition,
    validation,
    dirty,
    selectedStepId
  } = useWorkflowDefinitionEditor();

  return (
    <div className="workflow-definition-view">
      {/* Toolbar */}
      <WorkflowDefinitionToolbar />

      <div className="workflow-definition-layout">
        {/* Sidebar */}
        <WorkflowDefinitionSidebar />

        {/* Main Panel */}
        <div className="workflow-definition-main">
          {/* Validation Status */}
          <div className="workflow-definition-status">
            <span className={validation.valid ? "valid" : "invalid"}>
              {validation.valid ? "Valid" : "Invalid"}
            </span>

            {dirty && <span className="dirty">Unsaved changes</span>}
          </div>

          {/* Step Editor */}
          {selectedStepId ? (
            <WorkflowDefinitionStepEditor stepId={selectedStepId} />
          ) : (
            <div className="workflow-definition-empty">
              Select a step to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
