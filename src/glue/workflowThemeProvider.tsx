/**
 * workflowThemeProvider.tsx
 *
 * React context provider for the Valtaris Glue workflow theme.
 * Provides:
 * - typed theme access
 * - deterministic theme injection
 * - clean separation between tokens and UI
 *
 * This is the design-system context layer for the workflow subsystem.
 */

import { createContext, useContext } from "react";
import { workflowTheme } from "./workflowTheme";

export type WorkflowTheme = typeof workflowTheme;

const WorkflowThemeContext = createContext<WorkflowTheme>(workflowTheme);

/**
 * Provides the workflow theme to all children.
 */
export function WorkflowThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <WorkflowThemeContext.Provider value={workflowTheme}>
      {children}
    </WorkflowThemeContext.Provider>
  );
}

/**
 * Hook for accessing the workflow theme.
 */
export function useWorkflowTheme(): WorkflowTheme {
  return useContext(WorkflowThemeContext);
}
