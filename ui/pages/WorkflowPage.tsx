import React from "react";
import { DashboardShell } from "../navigation/DashboardShell";
import { Panel } from "../dashboard/Panel";
import { WorkflowItem } from "../dashboard/WorkflowItem";

export const WorkflowPage = ({ navItems, active, onSelect, workflows }) => {
  return (
    <DashboardShell navItems={navItems} active={active} onSelect={onSelect}>
      <Panel title="Workflows">
        {workflows.map((wf) => (
          <WorkflowItem key={wf.id} id={wf.id} name={wf.name} status={wf.status} />
        ))}
      </Panel>
    </DashboardShell>
  );
};
