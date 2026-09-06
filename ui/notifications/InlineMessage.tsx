import React from "react";
import { colors, typography } from "../tokens";

export const InlineMessage = ({ type = "info", children }) => {
  const map = {
    success: colors.valtarisGold,
    info: colors.valtarisBlue,
    error: "#FF4F4F",
    warning: "#F5A623",
  };

  return (
    <span
      style={{
        color: map[type],
        fontFamily: typography.fontFamily.secondary,
        fontSize: typography.sizes.sm,
      }}
    >
      {children}
    </span>
  );
};
