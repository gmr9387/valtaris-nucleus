import React from "react";
import { colors, spacing, radius, effects } from "../tokens";

export const Card = ({
  children,
  padding = "lg",
  style = {},
}) => {
  return (
    <div
      style={{
        backgroundColor: colors.spaceBlack,
        padding: spacing[padding],
        borderRadius: radius.lg,
        boxShadow: effects.shadow.md,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
