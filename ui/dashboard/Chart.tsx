import React from "react";
import { colors, spacing, radius, effects } from "../tokens";

export const Chart = () => {
  return (
    <div
      style={{
        height: 240,
        backgroundColor: colors.satelliteGray,
        borderRadius: radius.lg,
        boxShadow: effects.shadow.md,
        padding: spacing.lg,
        color: colors.white,
      }}
    >
      Chart Placeholder
    </div>
  );
};
