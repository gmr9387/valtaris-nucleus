/**
 * Step editor UI for the Valtaris Glue workflow definition builder.
 * Provides deterministic editing of step type, name, config, and metadata.
 */

import { useState } from "react";
import { WorkflowStep } from "./workflow";

interface StepEditorProps {
  step: WorkflowStep;
  onChange: (updated: WorkflowStep) => void;
}

export function StepEditor(props: StepEditorProps) {
  const [local, setLocal] = useState<WorkflowStep>(props.step);

  function update<K extends keyof WorkflowStep>(key: K, value: WorkflowStep[K]) {
    const updated = { ...local, [key]: value };
    setLocal(updated);
    props.onChange(updated);
  }

  return (
    <div className="step-editor">
      <h3>Step Editor</h3>

      <label>Step Name</label>
      <input
        value={local.name}
        onChange={e => update("name", e.target.value)}
      />

      <label>Step Type</label>
      <select
        value={local.type}
        onChange={e => update("type", e.target.value)}
      >
        <option value="task">task</option>
        <option value="decision">decision</option>
        <option value="connector_call">connector_call</option>
        <option value="delay">delay</option>
        <option value="branch">branch</option>
      </select>

      <label>Config</label>
      <textarea
        value={JSON.stringify(local.config, null, 2)}
        onChange={e => {
          try {
            update("config", JSON.parse(e.target.value || "{}"));
          } catch {
            // ignore invalid JSON
          }
        }}
      />

      <label>Metadata</label>
      <textarea
        value={JSON.stringify(local.metadata, null, 2)}
        onChange={e => {
          try {
            update("metadata", JSON.parse(e.target.value || "{}"));
          } catch {
            // ignore invalid JSON
          }
        }}
      />
    </div>
  );
}
