import React from "react";
import { Row } from "../layout/Row";
import { StatusBadge } from "./StatusBadge";
import { colors, spacing, typography } from "../tokens";

export const WorkflowItem = ({ id, name, status }) => {
  return (
    <Row
      gap="lg"
      style={{
        padding: spacing.md,
        borderBottom: `1px solid ${colors.satelliteGray}`,
      }}
    >
      <span
        style={{
          fontFamily: typography.fontFamily.primary,
          color: colors.white,
        }}
      >
        {name}
      </span>

      <StatusBadge status={status} />

      <span style={{ color: colors.satelliteGray }}>#{id}</span>
    </Row>
  );
};
