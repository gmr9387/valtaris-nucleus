import React from "react";
import { colors, spacing, radius, effects, typography } from "../tokens";

export const Button = ({
  children,
  onClick,
  variant = "primary",
  style = {},
}) => {
  const variants = {
    primary: {
      background: colors.valtarisBlue,
      color: colors.white,
      glow: effects.glow.blue,
    },
    gold: {
      background: colors.valtarisGold,
      color: colors.spaceBlack,
      glow: effects.glow.gold,
    },
  };

  const v = variants[variant];

  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: v.background,
        color: v.color,
        padding: spacing.md,
        borderRadius: radius.md,
        border: "none",
        cursor: "pointer",
        fontFamily: typography.fontFamily.primary,
        fontSize: typography.sizes.md,
        boxShadow: v.glow,
        ...style,
      }}
    >
      {children}
    </button>
  );
};
