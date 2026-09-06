import React, { useEffect, useState } from "react";
import { WorkflowPage } from "../../ui/pages/WorkflowPage";
import { fetchWorkflows } from "../data/workflows";
import { createWorkflow } from "../flows/createWorkflow";

export const Workflows = ({ navItems, active, onSelect }) => {
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    fetchWorkflows().then(setWorkflows);
  }, []);

  const add = async () => {
    await createWorkflow({ name: "New Workflow", type: "default" });
    const updated = await fetchWorkflows();
    setWorkflows(updated);
  };

  return (
    <WorkflowPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      workflows={workflows}
      onCreate={add}
    />
  );
};
