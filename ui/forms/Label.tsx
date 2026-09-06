import React from "react";
import { colors, typography } from "../tokens";

export const Label = ({ children }) => {
  return (
    <span
      style={{
        fontFamily: typography.fontFamily.secondary,
        fontSize: typography.sizes.sm,
        color: colors.satelliteGray,
      }}
    >
      {children}
    </span>
  );
};
