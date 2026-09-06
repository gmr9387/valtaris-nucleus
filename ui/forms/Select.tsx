import React from "react";
import { colors, spacing, radius, typography } from "../tokens";

export const Select = ({ value, onChange, options }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        backgroundColor: colors.satelliteGray,
        color: colors.white,
        padding: spacing.md,
        borderRadius: radius.md,
        border: `1px solid ${colors.valtarisBlue}`,
        fontFamily: typography.fontFamily.secondary,
        fontSize: typography.sizes.md,
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
