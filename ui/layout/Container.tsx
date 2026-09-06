import React from "react";
import { spacing } from "../tokens/spacing";

export const Container = ({
  maxWidth = 1200,
  padding = "lg",
  children,
  style = {},
}) => {
  return (
    <div
      style={{
        maxWidth,
        margin: "0 auto",
        padding: spacing[padding],
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
