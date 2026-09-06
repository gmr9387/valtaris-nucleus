import React from "react";
import { colors, spacing, radius, effects } from "../tokens";

export const Popover = ({ open, children }) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        backgroundColor: colors.spaceBlack,
        padding: spacing.md,
        borderRadius: radius.md,
        boxShadow: effects.shadow.md,
        zIndex: 9999,
      }}
    >
      {children}
    </div>
  );
};
