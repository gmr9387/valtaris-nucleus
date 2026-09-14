/**
 * workflowAppRoot.tsx
 *
 * Final mounted entrypoint for the Valtaris Glue workflow runtime UI.
 * Responsibilities:
 * - initialize theme (Swap 69)
 * - mount WorkflowApp (Swap 64)
 * - provide a clean, stable root component for Nucleus routing
 */

import { WorkflowThemeInit } from "./workflowThemeInit";
import { WorkflowApp } from "./workflowApp";

interface WorkflowAppRootProps {
  userId: string;
}

export function WorkflowAppRoot(props: WorkflowAppRootProps) {
  return (
    <WorkflowThemeInit>
      <WorkflowApp userId={props.userId} />
    </WorkflowThemeInit>
  );
}
