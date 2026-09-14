/**
 * Trigger editor UI for the Valtaris Glue workflow definition builder.
 * Provides deterministic editing of trigger type, config, and metadata.
 */

import { useState } from "react";
import { WorkflowTrigger } from "./workflow";

interface TriggerEditorProps {
  trigger: WorkflowTrigger;
  onChange: (updated: WorkflowTrigger) => void;
}

export function TriggerEditor(props: TriggerEditorProps) {
  const [local, setLocal] = useState<WorkflowTrigger>(props.trigger);

  function update<K extends keyof WorkflowTrigger>(key: K, value: WorkflowTrigger[K]) {
    const updated = { ...local, [key]: value };
    setLocal(updated);
    props.onChange(updated);
  }

  return (
    <div className="trigger-editor">
      <h3>Trigger Editor</h3>

      <label>Trigger Type</label>
      <select
        value={local.type}
        onChange={e => update("type", e.target.value)}
      >
        <option value="http">http</option>
        <option value="schedule">schedule</option>
        <option value="event">event</option>
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
