import React from "react";
import { colors, spacing, radius, effects, typography } from "../tokens";

export const Toast = ({ message, type }) => {
  const map = {
    success: colors.valtarisGold,
    info: colors.valtarisBlue,
    error: "#FF4F4F",
    warning: "#F5A623",
  };

  return (
    <div
      style={{
        backgroundColor: map[type] || colors.valtarisBlue,
        color: colors.spaceBlack,
        padding: spacing.md,
        borderRadius: radius.md,
        boxShadow: effects.shadow.md,
        fontFamily: typography.fontFamily.secondary,
        fontSize: typography.sizes.md,
        marginBottom: spacing.md,
        minWidth: 240,
      }}
    >
      {message}
    </div>
  );
};
