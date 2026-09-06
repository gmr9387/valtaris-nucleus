import React from "react";
import { WorkflowPage } from "../../ui/pages/WorkflowPage";

export const Workflows = ({ navItems, active, onSelect }) => {
  return (
    <WorkflowPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      workflows={[]}
    />
  );
};
