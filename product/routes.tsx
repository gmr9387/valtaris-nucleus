import React from "react";
import { Routes, Route } from "react-router-dom";

import { DashboardPage } from "../ui/pages/DashboardPage";
import { WorkflowPage } from "../ui/pages/WorkflowPage";
import { PaymentsPage } from "../ui/pages/PaymentsPage";
import { MonitoringPage } from "../ui/pages/MonitoringPage";
import { SecurityPage } from "../ui/pages/SecurityPage";
import { IdentityPage } from "../ui/pages/IdentityPage";
import { SettingsPage } from "../ui/pages/SettingsPage";

const navItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "workflows", label: "Workflows" },
  { id: "payments", label: "Payments" },
  { id: "monitoring", label: "Monitoring" },
  { id: "security", label: "Security" },
  { id: "identity", label: "Identity" },
  { id: "settings", label: "Settings" },
];

export const AppRoutes = () => {
  const [active, setActive] = React.useState("dashboard");

  const withShell = (Page) => (
    <Page
      navItems={navItems}
      active={active}
      onSelect={setActive}

      metrics={[]}
      workflows={[]}
      payments={[]}
      events={[]}
      identities={[]}
      form={{ values: {}, errors: {}, set: () => {}, onSubmit: () => {} }}
    />
  );

  return (
    <Routes>
      <Route path="/dashboard" element={withShell(DashboardPage)} />
      <Route path="/workflows" element={withShell(WorkflowPage)} />
      <Route path="/payments" element={withShell(PaymentsPage)} />
      <Route path="/monitoring" element={withShell(MonitoringPage)} />
      <Route path="/security" element={withShell(SecurityPage)} />
      <Route path="/identity" element={withShell(IdentityPage)} />
      <Route path="/settings" element={withShell(SettingsPage)} />

      <Route path="/login" element={<div>Login</div>} />
      <Route path="/org" element={<div>Org Selection</div>} />
    </Routes>
  );
};
