import React from "react";
import { spacing } from "../tokens/spacing";

export const Row = ({
  gap = "md",
  align = "center",
  justify = "flex-start",
  children,
  style = {},
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: align,
        justifyContent: justify,
        gap: spacing[gap],
        ...style,
      }}
    >
      {children}
    </div>
  );
};
