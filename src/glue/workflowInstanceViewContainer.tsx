/**
 * Workflow Instance View Container for the Valtaris Glue runtime.
 * Binds together:
 * - workflow instance hooks
 * - workflow step state hooks
 * - workflow instance context
 * - workflow instance viewer
 */

import { WorkflowInstanceProvider } from "./workflowInstanceContext";
import { WorkflowInstanceView } from "./workflowInstanceView";
import { useWorkflowInstance, useWorkflowStepStates } from "./workflowInstanceHooks";

interface WorkflowInstanceViewContainerProps {
  instanceId: string;
}

export function WorkflowInstanceViewContainer(
  props: WorkflowInstanceViewContainerProps
) {
  const {
    instance,
    loading: instanceLoading,
    error: instanceError
  } = useWorkflowInstance(props.instanceId);

  const {
    steps,
    loading: stepsLoading,
    error: stepsError
  } = useWorkflowStepStates(props.instanceId);

  if (instanceLoading || stepsLoading) {
    return <div>Loading workflow instance…</div>;
  }

  if (instanceError || stepsError || !instance) {
    return (
      <div>
        Error loading instance: {instanceError ?? stepsError ?? "Unknown error"}
      </div>
    );
  }

  return (
    <WorkflowInstanceProvider
      initialInstance={instance}
      initialSteps={steps}
    >
      <WorkflowInstanceView instanceId={props.instanceId} />
    </WorkflowInstanceProvider>
  );
}
