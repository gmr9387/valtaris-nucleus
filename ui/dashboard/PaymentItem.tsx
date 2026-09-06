import React from "react";
import { Row } from "../layout/Row";
import { StatusBadge } from "./StatusBadge";
import { colors, spacing, typography } from "../tokens";

export const PaymentItem = ({ id, amount, currency, status }) => {
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
        {currency} {amount}
      </span>

      <StatusBadge status={status} />

      <span style={{ color: colors.satelliteGray }}>#{id}</span>
    </Row>
  );
};
