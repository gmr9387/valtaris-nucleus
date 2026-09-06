import React from "react";
import { DashboardShell } from "../navigation/DashboardShell";
import { Panel } from "../dashboard/Panel";
import { DataTable } from "../dashboard/DataTable";

export const MonitoringPage = ({ navItems, active, onSelect, metrics }) => {
  return (
    <DashboardShell navItems={navItems} active={active} onSelect={onSelect}>
      <Panel title="Monitoring">
        <DataTable
          columns={["metric", "value", "timestamp"]}
          rows={metrics}
        />
      </Panel>
    </DashboardShell>
  );
};
