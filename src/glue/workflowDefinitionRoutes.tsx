/**
 * workflowDefinitionRoutes.ts
 *
 * Route definitions for the Workflow Definition subsystem.
 *
 * Responsibilities:
 * - define /glue/workflow/definition/:id route
 * - bind WorkflowDefinitionEditor (Swap 84)
 * - integrate with Nucleus router
 */

import { RouteObject } from "react-router-dom";
import { WorkflowDefinitionEditor } from "./workflowDefinitionEditor";

export const workflowDefinitionRoutes: RouteObject[] = [
  {
    path: "/glue/workflow/definition/:id",
    element: <WorkflowDefinitionEditorWrapper />
  }
];

/**
 * Wrapper to extract route params and pass them to the editor.
 */
import { useParams } from "react-router-dom";

function WorkflowDefinitionEditorWrapper() {
  const { id } = useParams();
  if (!id) {
    return <div>Workflow definition ID missing.</div>;
  }

  return <WorkflowDefinitionEditor workflowId={id} />;
}
