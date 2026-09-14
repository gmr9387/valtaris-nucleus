/**
 * workflowThemeInit.ts
 *
 * Automatic initialization for the Valtaris Glue workflow theme.
 * Responsibilities:
 * - inject global CSS variables (Swap 68)
 * - wrap WorkflowApp with WorkflowThemeProvider (Swap 67)
 *
 * This ensures the theme is always active without requiring
 * manual setup by the consumer.
 */

import { useEffect } from "react";
import { injectWorkflowThemeGlobals } from "./workflowThemeGlobals";
import { WorkflowThemeProvider } from "./workflowThemeProvider";

interface WorkflowThemeInitProps {
  children: React.ReactNode;
}

export function WorkflowThemeInit(props: WorkflowThemeInitProps) {
  useEffect(() => {
    injectWorkflowThemeGlobals();
  }, []);

  return (
    <WorkflowThemeProvider>
      {props.children}
    </WorkflowThemeProvider>
  );
}
