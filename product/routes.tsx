import React from "react";
import { Routes, Route } from "react-router-dom";

import { Dashboard } from "./pages/Dashboard";
import { Workflows } from "./pages/Workflows";
import { Payments } from "./pages/Payments";
import { Monitoring } from "./pages/Monitoring";
import { Security } from "./pages/Security";
import { Identity } from "./pages/Identity";
import { Settings } from "./pages/Settings";

import { Login } from "./pages/Login";
import { Org } from "./pages/Org";

import { AdminPage } from "./admin/AdminPage";
import { AnalyticsPage } from "./analytics/AnalyticsPage";
import { ExtensionsPage } from "./extensions/ExtensionsPage";
import { SDKDemo } from "./pages/SDKDemo";
import { MarketplacePage } from "./marketplace/MarketplacePage";

import { useSession } from "./auth/SessionProvider";

const navItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "workflows", label: "Workflows" },
  { id: "payments", label: "Payments" },
  { id: "monitoring", label: "Monitoring" },
  { id: "security", label: "Security" },
  { id: "identity", label: "Identity" },
  { id: "settings", label: "Settings" },
  { id: "admin", label: "Admin" },
  { id: "analytics", label: "Analytics" },
  { id: "extensions", label: "Extensions" },
  { id: "sdk", label: "SDK" },
  { id: "marketplace", label: "Marketplace" }
];

export const AppRoutes = () => {
  const session = useSession();
  const [active, setActive] = React.useState("dashboard");

  if (session.loading) return <div>Loading...</div>;
  if (!session.user) return <Login />;
  if (!session.org) return <Org />;

  return (
    <Routes>
      <Route
        path="/dashboard"
        element={<Dashboard navItems={navItems} active={active} onSelect={setActive} />}
      />
      <Route
        path="/workflows"
        element={<Workflows navItems={navItems} active={active} onSelect={setActive} />}
      />
      <Route
        path="/payments"
        element={<Payments navItems={navItems} active={active} onSelect={setActive} />}
      />
      <Route
        path="/monitoring"
        element={<Monitoring navItems={navItems} active={active} onSelect={setActive} />}
      />
      <Route
        path="/security"
        element={<Security navItems={navItems} active={active} onSelect={setActive} />}
      />
      <Route
        path="/identity"
        element={<Identity navItems={navItems} active={active} onSelect={setActive} />}
      />
      <Route
        path="/settings"
        element={<Settings navItems={navItems} active={active} onSelect={setActive} />}
      />
      <Route
        path="/admin"
        element={<AdminPage />}
      />
      <Route
        path="/analytics"
        element={<AnalyticsPage />}
      />
      <Route
        path="/extensions"
        element={<ExtensionsPage />}
      />
      <Route
        path="/sdk"
        element={<SDKDemo />}
      />
      <Route
        path="/marketplace"
        element={<MarketplacePage />}
      />
    </Routes>
  );
};
