/**
 * Workflow Instance Context for the Valtaris Glue runtime.
 * Provides deterministic shared state for:
 * - workflow instance metadata
 * - workflow step states
 * Used by nested runtime viewers and inspectors.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode
} from "react";

import { WorkflowInstance, WorkflowStepState } from "./workflowInstance";

interface WorkflowInstanceContextValue {
  instance: WorkflowInstance | null;
  steps: WorkflowStepState[];
  setInstance: (inst: WorkflowInstance) => void;
  setSteps: (steps: WorkflowStepState[]) => void;
  updateInstance: (partial: Partial<WorkflowInstance>) => void;
  updateStep: (stepId: string, partial: Partial<WorkflowStepState>) => void;
}

const WorkflowInstanceContext = createContext<WorkflowInstanceContextValue | null>(
  null
);

export function WorkflowInstanceProvider({
  initialInstance,
  initialSteps,
  children
}: {
  initialInstance: WorkflowInstance;
  initialSteps: WorkflowStepState[];
  children: ReactNode;
}) {
  const [instance, setInstance] = useState<WorkflowInstance>(initialInstance);
  const [steps, setSteps] = useState<WorkflowStepState[]>(initialSteps);

  const updateInstance = useCallback(
    (partial: Partial<WorkflowInstance>) => {
      setInstance(prev => ({ ...prev, ...partial }));
    },
    []
  );

  const updateStep = useCallback(
    (stepId: string, partial: Partial<WorkflowStepState>) => {
      setSteps(prev =>
        prev.map(s => (s.id === stepId ? { ...s, ...partial } : s))
      );
    },
    []
  );

  return (
    <WorkflowInstanceContext.Provider
      value={{
        instance,
        steps,
        setInstance,
        setSteps,
        updateInstance,
        updateStep
      }}
    >
      {children}
    </WorkflowInstanceContext.Provider>
  );
}

export function useWorkflowInstanceContext() {
  const ctx = useContext(WorkflowInstanceContext);
  if (!ctx) {
    throw new Error(
      "useWorkflowInstanceContext must be used within a WorkflowInstanceProvider"
    );
  }
  return ctx;
}
