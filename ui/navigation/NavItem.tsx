import React from "react";
import { colors, spacing, radius, typography } from "../tokens";

export const NavItem = ({ label, icon, active = false, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.md,
        cursor: "pointer",
        backgroundColor: active ? colors.valtarisBlue : "transparent",
        color: active ? colors.white : colors.white,
        fontFamily: typography.fontFamily.primary,
      }}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </div>
  );
};
