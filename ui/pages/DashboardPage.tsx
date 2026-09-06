import React from "react";
import { DashboardShell } from "../navigation/DashboardShell";
import { Grid } from "../layout/Grid";
import { MetricCard } from "../dashboard/MetricCard";
import { Panel } from "../dashboard/Panel";

export const DashboardPage = ({ navItems, active, onSelect, metrics }) => {
  return (
    <DashboardShell navItems={navItems} active={active} onSelect={onSelect}>
      <Grid columns={3} gap="lg" style={{ padding: 24 }}>
        {metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} />
        ))}
      </Grid>

      <Panel title="System Overview">
        <div>Welcome to the Valtaris Dashboard.</div>
      </Panel>
    </DashboardShell>
  );
};
