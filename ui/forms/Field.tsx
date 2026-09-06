import React from "react";
import { spacing } from "../tokens/spacing";

export const Field = ({ label, children, error }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
      {label}
      {children}
      {error && (
        <span style={{ color: "#FF4F4F", fontSize: 12 }}>
          {error}
        </span>
      )}
    </div>
  );
};
