import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export const DashboardShell = ({
  navItems,
  active,
  onSelect,
  children,
}) => {
  return (
    <div style={{ display: "flex", width: "100%", height: "100vh" }}>
      <Sidebar items={navItems} active={active} onSelect={onSelect} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar title={navItems.find((i) => i.id === active)?.label} />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
};
