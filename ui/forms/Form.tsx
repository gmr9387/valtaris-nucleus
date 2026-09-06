import React from "react";
import { spacing } from "../tokens/spacing";

export const Form = ({ children, onSubmit, style = {} }) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing.lg,
        ...style,
      }}
    >
      {children}
    </form>
  );
};
