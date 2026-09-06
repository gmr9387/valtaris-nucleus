import React from "react";
import { spacing } from "../tokens/spacing";

export const Stack = ({
  gap = "md",
  children,
  style = {},
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing[gap],
        ...style,
      }}
    >
      {children}
    </div>
  );
};
