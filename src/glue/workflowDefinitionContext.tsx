/**
 * workflowDefinitionContext.tsx
 *
 * React context wrapper for the Workflow Definition Editor State.
 *
 * Responsibilities:
 * - provide global editor state to all workflow definition UI components
 * - wrap the state engine from Swap 79
 * - expose a typed hook for consuming editor state
 */

import { createContext, useContext } from "react";
import {
  WorkflowDefinition,
} from "./workflowDefinitionTypes";

import {
  useWorkflowDefinitionEditorState,
  WorkflowDefinitionEditorState
} from "./workflowDefinitionEditorState";

/* -------------------------------------------------------
 * Context
 * ----------------------------------------------------- */

const WorkflowDefinitionEditorContext =
  createContext<WorkflowDefinitionEditorState | null>(null);

/* -------------------------------------------------------
 * Provider
 * ----------------------------------------------------- */

interface WorkflowDefinitionEditorProviderProps {
  initial: WorkflowDefinition;
  children: React.ReactNode;
}

export function WorkflowDefinitionEditorProvider(
  props: WorkflowDefinitionEditorProviderProps
) {
  const state = useWorkflowDefinitionEditorState(props.initial);

  return (
    <WorkflowDefinitionEditorContext.Provider value={state}>
      {props.children}
    </WorkflowDefinitionEditorContext.Provider>
  );
}

/* -------------------------------------------------------
 * Hook
 * ----------------------------------------------------- */

export function useWorkflowDefinitionEditor() {
  const ctx = useContext(WorkflowDefinitionEditorContext);
  if (!ctx) {
    throw new Error(
      "useWorkflowDefinitionEditor must be used inside WorkflowDefinitionEditorProvider"
    );
  }
  return ctx;
}
