import React from "react";
import { colors, spacing, radius, effects } from "../tokens";

export const Panel = ({ title, children }) => {
  return (
    <div
      style={{
        backgroundColor: colors.spaceBlack,
        padding: spacing.lg,
        borderRadius: radius.lg,
        boxShadow: effects.shadow.md,
        display: "flex",
        flexDirection: "column",
        gap: spacing.md,
      }}
    >
      <h2 style={{ color: colors.valtarisBlue }}>{title}</h2>
      {children}
    </div>
  );
};
