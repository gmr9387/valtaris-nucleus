import React from "react";
import { colors, spacing, typography } from "../tokens";

export const Topbar = ({ title }) => {
  return (
    <div
      style={{
        width: "100%",
        height: 64,
        backgroundColor: colors.spaceBlack,
        borderBottom: `1px solid ${colors.satelliteGray}`,
        display: "flex",
        alignItems: "center",
        paddingLeft: spacing.lg,
        fontFamily: typography.fontFamily.primary,
        fontSize: typography.sizes.lg,
        color: colors.white,
      }}
    >
      {title}
    </div>
  );
};
