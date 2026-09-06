import React, { useEffect, useState } from "react";
import { WorkflowPage } from "../../ui/pages/WorkflowPage";
import { fetchWorkflows } from "../data/workflows";

export const Workflows = ({ navItems, active, onSelect }) => {
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    fetchWorkflows().then(setWorkflows);
  }, []);

  return (
    <WorkflowPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      workflows={workflows}
    />
  );
};
