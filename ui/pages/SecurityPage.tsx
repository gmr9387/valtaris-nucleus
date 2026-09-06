import React from "react";
import { DashboardShell } from "../navigation/DashboardShell";
import { Panel } from "../dashboard/Panel";
import { DataTable } from "../dashboard/DataTable";

export const SecurityPage = ({ navItems, active, onSelect, events }) => {
  return (
    <DashboardShell navItems={navItems} active={active} onSelect={onSelect}>
      <Panel title="Security Events">
        <DataTable
          columns={["event", "actor", "timestamp"]}
          rows={events}
        />
      </Panel>
    </DashboardShell>
  );
};
