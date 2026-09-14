/**
 * WorkflowApp — Final exported Glue Workflow Application.
 *
 * This is the public-facing component that Nucleus imports to expose
 * the entire Glue workflow runtime:
 *
 * - WorkflowShell (Swap 63)
 * - Navigation (Swap 62)
 * - Unified Workflow UI (Swap 61)
 *
 * Provides a clean, stable boundary between Glue and the rest of the system.
 */

import { WorkflowShell } from "./workflowShell";

interface WorkflowAppProps {
  userId: string;
}

export function WorkflowApp(props: WorkflowAppProps) {
  return (
    <div className="workflow-app">
      <WorkflowShell userId={props.userId} />
    </div>
  );
}
