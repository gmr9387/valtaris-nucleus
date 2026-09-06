import React from "react";
import { MonitoringPage } from "../../ui/pages/MonitoringPage";

export const Monitoring = ({ navItems, active, onSelect }) => {
  return (
    <MonitoringPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      metrics={[]}
    />
  );
};
