import React from "react";
import { colors, spacing, radius, typography } from "../tokens";

export const Alert = ({ type = "info", children }) => {
  const map = {
    success: colors.valtarisGold,
    info: colors.valtarisBlue,
    error: "#FF4F4F",
    warning: "#F5A623",
  };

  return (
    <div
      style={{
        backgroundColor: map[type],
        color: colors.spaceBlack,
        padding: spacing.md,
        borderRadius: radius.md,
        fontFamily: typography.fontFamily.secondary,
        fontSize: typography.sizes.md,
      }}
    >
      {children}
    </div>
  );
};
