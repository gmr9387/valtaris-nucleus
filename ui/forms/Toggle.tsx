import React from "react";
import { colors, radius } from "../tokens";

export const Toggle = ({ value, onChange }) => {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 48,
        height: 24,
        backgroundColor: value ? colors.valtarisBlue : colors.satelliteGray,
        borderRadius: radius.xl,
        cursor: "pointer",
        position: "relative",
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          backgroundColor: colors.white,
          borderRadius: radius.xl,
          position: "absolute",
          top: 2,
          left: value ? 24 : 2,
          transition: "left 0.2s",
        }}
      />
    </div>
  );
};
