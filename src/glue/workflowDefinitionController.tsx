/**
 * workflowDefinitionController.ts
 *
 * Top-level orchestrator for the Workflow Definition subsystem.
 *
 * Responsibilities:
 * - load workflow definitions (Swap 76)
 * - initialize editor provider (Swap 80)
 * - bind registry + loader + context
 * - expose deterministic entrypoint for definition editor UI
 */

import { useEffect, useState } from "react";

import { WorkflowDefinition } from "./workflowDefinitionTypes";
import { registryLoad } from "./workflowDefinitionRegistry";
import { WorkflowDefinitionEditorProvider } from "./workflowDefinitionContext";

interface WorkflowDefinitionControllerProps {
  workflowId: string;
  children: React.ReactNode;
}

export function WorkflowDefinitionController(
  props: WorkflowDefinitionControllerProps
) {
  const { workflowId, children } = props;

  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------------
   * Load definition from registry + Supabase
   * ----------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const result = await registryLoad(workflowId);

      if (!mounted) return;

      if (!result.success || !result.definition) {
        setError(result.error ?? "Failed to load workflow definition.");
        setLoading(false);
        return;
      }

      setDefinition(result.definition);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [workflowId]);

  /* -------------------------------------------------------
   * Render states
   * ----------------------------------------------------- */
  if (loading) {
    return <div>Loading workflow definition…</div>;
  }

  if (error) {
    return <div>Error loading workflow definition: {error}</div>;
  }

  if (!definition) {
    return <div>Workflow definition not found.</div>;
  }

  /* -------------------------------------------------------
   * Provide editor state to children
   * ----------------------------------------------------- */
  return (
    <WorkflowDefinitionEditorProvider initial={definition}>
      {children}
    </WorkflowDefinitionEditorProvider>
  );
}
