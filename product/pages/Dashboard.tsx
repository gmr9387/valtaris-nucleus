import React, { useEffect, useState } from "react";
import { DashboardPage } from "../../ui/pages/DashboardPage";
import { fetchMetrics } from "../data/monitoring";

export const Dashboard = ({ navItems, active, onSelect }) => {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    fetchMetrics().then(setMetrics);
  }, []);

  return (
    <DashboardPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      metrics={metrics}
    />
  );
};
