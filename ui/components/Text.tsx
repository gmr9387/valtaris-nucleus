import React from "react";
import { typography, colors } from "../tokens";

export const Text = ({
  children,
  size = "md",
  weight = "regular",
  color = "white",
  style = {},
}) => {
  return (
    <span
      style={{
        fontFamily: typography.fontFamily.primary,
        fontSize: typography.sizes[size],
        fontWeight: typography.weight[weight],
        color: colors[color],
        ...style,
      }}
    >
      {children}
    </span>
  );
};
