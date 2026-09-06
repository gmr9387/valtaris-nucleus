import React from "react";
import { spacing } from "../tokens/spacing";

export const Grid = ({
  columns = 12,
  gap = "md",
  children,
  style = {},
}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: spacing[gap],
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
