/**
 * Workflow editor UI for the Valtaris Glue control plane.
 * Provides deterministic editing of workflow metadata,
 * name, description, and version preparation.
 */

import { useEffect, useState } from "react";
import { Workflow } from "./workflow";

interface WorkflowEditorProps {
  workflowId: string;
  organizationId: string;
  projectId: string;
  environmentId: string;
}

export function WorkflowEditor(props: WorkflowEditorProps) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  const params = new URLSearchParams({
    organizationId: props.organizationId,
    projectId: props.projectId,
    environmentId: props.environmentId,
    id: props.workflowId
  });

  useEffect(() => {
    async function load() {
      setLoading(true);

      const res = await fetch(`/workflows/get?${params.toString()}`);
      const data = await res.json();

      setWorkflow(data);
      setLoading(false);
    }

    load();
  }, [props.workflowId]);

  if (loading) {
    return <div>Loading workflow…</div>;
  }

  if (!workflow) {
    return <div>Workflow not found.</div>;
  }

  async function save() {
    const res = await fetch(`/workflows/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        metadata: workflow.metadata,
        organizationId: props.organizationId,
        projectId: props.projectId,
        environmentId: props.environmentId
      })
    });

    const result = await res.json();
    console.log("Workflow updated:", result);
  }

  return (
    <div className="workflow-editor">
      <h2>Edit Workflow</h2>

      <label>Name</label>
      <input
        value={workflow.name}
        onChange={e => setWorkflow({ ...workflow, name: e.target.value })}
      />

      <label>Description</label>
      <textarea
        value={workflow.description}
        onChange={e =>
          setWorkflow({ ...workflow, description: e.target.value })
        }
      />

      <label>Metadata</label>
      <textarea
        value={JSON.stringify(workflow.metadata, null, 2)}
        onChange={e =>
          setWorkflow({
            ...workflow,
            metadata: JSON.parse(e.target.value || "{}")
          })
        }
      />

      <button onClick={save}>Save</button>
    </div>
  );
}
