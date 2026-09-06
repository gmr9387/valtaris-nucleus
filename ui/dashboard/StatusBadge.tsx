import React from "react";
import { colors, radius, spacing, typography } from "../tokens";

export const StatusBadge = ({ status }) => {
  const map = {
    success: colors.valtarisGold,
    running: colors.valtarisBlue,
    failed: "#FF4F4F",
    pending: colors.satelliteGray,
  };

  return (
    <span
      style={{
        backgroundColor: map[status] || colors.satelliteGray,
        padding: `${spacing.xs}px ${spacing.sm}px`,
        borderRadius: radius.md,
        color: colors.spaceBlack,
        fontFamily: typography.fontFamily.secondary,
        fontSize: typography.sizes.sm,
      }}
    >
      {status.toUpperCase()}
    </span>
  );
};
