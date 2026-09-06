import React from "react";
import { colors, spacing, radius, effects, typography } from "../tokens";

export const MetricCard = ({ label, value }) => {
  return (
    <div
      style={{
        backgroundColor: colors.spaceBlack,
        padding: spacing.lg,
        borderRadius: radius.lg,
        boxShadow: effects.shadow.md,
        display: "flex",
        flexDirection: "column",
        gap: spacing.sm,
      }}
    >
      <span
        style={{
          fontFamily: typography.fontFamily.secondary,
          fontSize: typography.sizes.sm,
          color: colors.satelliteGray,
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontFamily: typography.fontFamily.primary,
          fontSize: typography.sizes.xxl,
          color: colors.valtarisBlue,
        }}
      >
        {value}
      </span>
    </div>
  );
};
