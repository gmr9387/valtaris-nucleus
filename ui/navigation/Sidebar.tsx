import React from "react";
import { colors, spacing } from "../tokens";
import { ValtarisBrand } from "../brand/Brand";
import { NavItem } from "./NavItem";

export const Sidebar = ({ items = [], active, onSelect }) => {
  return (
    <div
      style={{
        width: 260,
        backgroundColor: colors.spaceBlack,
        padding: spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: spacing.lg,
        height: "100vh",
        borderRight: `1px solid ${colors.satelliteGray}`,
      }}
    >
      <ValtarisBrand size={48} />

      <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
        {items.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={active === item.id}
            onClick={() => onSelect(item.id)}
          />
        ))}
      </div>
    </div>
  );
};
