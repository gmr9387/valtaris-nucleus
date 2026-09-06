import React from "react";
import { colors, spacing, radius, typography } from "../tokens";

export const Input = ({
  value,
  onChange,
  placeholder = "",
  style = {},
}) => {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        backgroundColor: colors.satelliteGray,
        color: colors.white,
        padding: spacing.md,
        borderRadius: radius.md,
        border: `1px solid ${colors.valtarisBlue}`,
        fontFamily: typography.fontFamily.secondary,
        fontSize: typography.sizes.md,
        ...style,
      }}
    />
  );
};
