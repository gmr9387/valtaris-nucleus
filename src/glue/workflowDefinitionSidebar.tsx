/**
 * workflowDefinitionSidebar.tsx
 *
 * Sidebar for the Workflow Definition Editor.
 *
 * Responsibilities:
 * - list workflow steps
 * - allow selecting a step
 * - allow adding/removing steps
 * - show validation indicators
 * - bind to editor state (Swap 79) via context (Swap 80)
 */

import { useWorkflowDefinitionEditor } from "./workflowDefinitionContext";
import { WorkflowStepDefinition } from "./workflowDefinitionTypes";

export function WorkflowDefinitionSidebar() {
  const {
    definition,
    validation,
    selectedStepId,
    selectStep,
    addStep,
    removeStep
  } = useWorkflowDefinitionEditor();

  /* -------------------------------------------------------
   * Add new step
   * ----------------------------------------------------- */
  function handleAddStep() {
    const newStep: WorkflowStepDefinition = {
      id: crypto.randomUUID(),
      name: "New Step",
      action: "",
      inputs: [],
      outputs: [],
      next: null
    };

    addStep(newStep);
    selectStep(newStep.id);
  }

  /* -------------------------------------------------------
   * Render
   * ----------------------------------------------------- */
  return (
    <div className="workflow-definition-sidebar">
      <div className="sidebar-header">
        <h3>Steps</h3>
        <button onClick={handleAddStep}>+ Add Step</button>
      </div>

      <div className="sidebar-steps">
        {definition.steps.map(step => {
          const isSelected = step.id === selectedStepId;

          // Validation indicator
          const stepValid = validation.errors.every(err => !err.includes(step.id));

          return (
            <div
              key={step.id}
              className={`sidebar-step ${isSelected ? "selected" : ""}`}
              onClick={() => selectStep(step.id)}
            >
              <div className="step-name">
                {step.name || "(unnamed step)"}
              </div>

              <div className={`step-status ${stepValid ? "valid" : "invalid"}`}>
                {stepValid ? "✓" : "!"}
              </div>

              <button
                className="remove-step"
                onClick={e => {
                  e.stopPropagation();
                  removeStep(step.id);
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
