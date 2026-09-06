import React, { useEffect, useState } from "react";
import { MonitoringPage } from "../../ui/pages/MonitoringPage";
import { fetchMetrics } from "../data/monitoring";

export const Monitoring = ({ navItems, active, onSelect }) => {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    fetchMetrics().then(setMetrics);
  }, []);

  return (
    <MonitoringPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      metrics={metrics}
    />
  );
};
