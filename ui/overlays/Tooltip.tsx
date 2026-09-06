import React from "react";
import { colors, spacing, radius, typography } from "../tokens";

export const Tooltip = ({ text }) => {
  return (
    <div
      style={{
        backgroundColor: colors.satelliteGray,
        color: colors.white,
        padding: spacing.sm,
        borderRadius: radius.md,
        fontFamily: typography.fontFamily.secondary,
        fontSize: typography.sizes.sm,
        position: "absolute",
        transform: "translateY(-120%)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};
