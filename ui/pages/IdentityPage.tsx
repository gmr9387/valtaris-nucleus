import React from "react";
import { DashboardShell } from "../navigation/DashboardShell";
import { Panel } from "../dashboard/Panel";
import { DataTable } from "../dashboard/DataTable";

export const IdentityPage = ({ navItems, active, onSelect, identities }) => {
  return (
    <DashboardShell navItems={navItems} active={active} onSelect={onSelect}>
      <Panel title="Identities">
        <DataTable
          columns={["email", "role", "created"]}
          rows={identities}
        />
      </Panel>
    </DashboardShell>
  );
};
