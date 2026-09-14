/**
 * workflowDefinitionStepEditor.tsx
 *
 * Step-level editor UI for workflow definitions.
 *
 * Responsibilities:
 * - edit step name, description, action
 * - edit inputs + outputs
 * - edit branching (next)
 * - bind to editor state (Swap 79) via context (Swap 80)
 */

import { useWorkflowDefinitionEditor } from "./workflowDefinitionContext";
import { WorkflowStepDefinition } from "./workflowDefinitionTypes";

interface Props {
  stepId: string;
}

export function WorkflowDefinitionStepEditor({ stepId }: Props) {
  const { definition, updateStep } = useWorkflowDefinitionEditor();

  const step = definition.steps.find(s => s.id === stepId);
  if (!step) {
    return <div>Step not found.</div>;
  }

  /* -------------------------------------------------------
   * Update helpers
   * ----------------------------------------------------- */
  function update<K extends keyof WorkflowStepDefinition>(
    key: K,
    value: WorkflowStepDefinition[K]
  ) {
    updateStep({
      ...step,
      [key]: value
    });
  }

  /* -------------------------------------------------------
   * Render
   * ----------------------------------------------------- */
  return (
    <div className="workflow-step-editor">
      <h2>Step: {step.name}</h2>

      {/* Name */}
      <div className="editor-field">
        <label>Name</label>
        <input
          value={step.name}
          onChange={e => update("name", e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="editor-field">
        <label>Description</label>
        <textarea
          value={step.description ?? ""}
          onChange={e => update("description", e.target.value)}
        />
      </div>

      {/* Action */}
      <div className="editor-field">
        <label>Action</label>
        <input
          value={step.action}
          onChange={e => update("action", e.target.value)}
        />
      </div>

      {/* Inputs */}
      <div className="editor-section">
        <h3>Inputs</h3>
        {step.inputs?.map((input, idx) => (
          <div key={idx} className="editor-field">
            <input
              value={input.name}
              placeholder="name"
              onChange={e => {
                const updated = [...(step.inputs ?? [])];
                updated[idx] = { ...input, name: e.target.value };
                update("inputs", updated);
              }}
            />
            <input
              value={input.type}
              placeholder="type"
              onChange={e => {
                const updated = [...(step.inputs ?? [])];
                updated[idx] = { ...input, type: e.target.value as any };
                update("inputs", updated);
              }}
            />
          </div>
        ))}

        <button
          onClick={() => {
            const updated = [...(step.inputs ?? [])];
            updated.push({ name: "", type: "string" });
            update("inputs", updated);
          }}
        >
          Add Input
        </button>
      </div>

      {/* Outputs */}
      <div className="editor-section">
        <h3>Outputs</h3>
        {step.outputs?.map((output, idx) => (
          <div key={idx} className="editor-field">
            <input
              value={output.name}
              placeholder="name"
              onChange={e => {
                const updated = [...(step.outputs ?? [])];
                updated[idx] = { ...output, name: e.target.value };
                update("outputs", updated);
              }}
            />
            <input
              value={output.type}
              placeholder="type"
              onChange={e => {
                const updated = [...(step.outputs ?? [])];
                updated[idx] = { ...output, type: e.target.value as any };
                update("outputs", updated);
              }}
            />
          </div>
        ))}

        <button
          onClick={() => {
            const updated = [...(step.outputs ?? [])];
            updated.push({ name: "", type: "string" });
            update("outputs", updated);
          }}
        >
          Add Output
        </button>
      </div>

      {/* Branching */}
      <div className="editor-section">
        <h3>Next Step</h3>
        <input
          value={
            Array.isArray(step.next)
              ? step.next.join(",")
              : step.next ?? ""
          }
          placeholder="next step id(s)"
          onChange={e => {
            const raw = e.target.value.trim();
            if (raw.includes(",")) {
              update("next", raw.split(",").map(s => s.trim()));
            } else {
              update("next", raw);
            }
          }}
        />
      </div>
    </div>
  );
}
