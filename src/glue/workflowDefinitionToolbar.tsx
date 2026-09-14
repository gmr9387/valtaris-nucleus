/**
 * workflowDefinitionToolbar.tsx
 *
 * Toolbar for the Workflow Definition Editor.
 *
 * Responsibilities:
 * - publish workflow definition
 * - undo / redo
 * - show validation summary
 * - show dirty state indicator
 * - bind to editor state (Swap 79) via context (Swap 80)
 */

import { useWorkflowDefinitionEditor } from "./workflowDefinitionContext";

export function WorkflowDefinitionToolbar() {
  const {
    validation,
    dirty,
    undo,
    redo,
    publish
  } = useWorkflowDefinitionEditor();

  async function handlePublish() {
    const result = await publish();
    if (!result.success) {
      alert(`Publish failed: ${result.error}`);
    } else {
      alert("Workflow published successfully.");
    }
  }

  return (
    <div className="workflow-definition-toolbar">
      {/* Left side: validation + dirty */}
      <div className="toolbar-status">
        <span className={validation.valid ? "valid" : "invalid"}>
          {validation.valid ? "Valid" : "Invalid"}
        </span>

        {dirty && <span className="dirty">Unsaved changes</span>}
      </div>

      {/* Right side: actions */}
      <div className="toolbar-actions">
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>

        <button className="publish-btn" onClick={handlePublish}>
          Publish
        </button>
      </div>
    </div>
  );
}
