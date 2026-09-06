import React from "react";
import { colors } from "../tokens/colors";

export const ValtarisBrand = ({ size = 48 }) => {
  const halfStar = (side) => (
    <div
      style={{
        width: size / 2,
        height: size / 2,
        backgroundColor: colors.valtarisGold,
        clipPath:
          side === "left"
            ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
            : "polygon(0% 0%, 50% 50%, 0% 100%, 100% 50%)",
      }}
    />
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {halfStar("left")}
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: colors.valtarisBlue,
          clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
        }}
      />
      {halfStar("right")}
    </div>
  );
};
