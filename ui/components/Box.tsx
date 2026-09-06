import React from "react";
import { colors, spacing, radius } from "../tokens";

export const Box = ({
  children,
  padding = "md",
  background = "spaceBlack",
  radius: r = "md",
  style = {},
}) => {
  return (
    <div
      style={{
        backgroundColor: colors[background],
        padding: spacing[padding],
        borderRadius: radius[r],
        ...style,
      }}
    >
      {children}
    </div>
  );
};
