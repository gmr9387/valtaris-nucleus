import React from "react";
import { DashboardPage } from "../../ui/pages/DashboardPage";

export const Dashboard = ({ navItems, active, onSelect }) => {
  return (
    <DashboardPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      metrics={[]}
    />
  );
};
