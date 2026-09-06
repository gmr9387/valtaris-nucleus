import React from "react";
import { colors } from "../tokens";

export const Radio = ({ checked, onChange }) => {
  return (
    <input
      type="radio"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{
        width: 18,
        height: 18,
        accentColor: colors.valtarisGold,
      }}
    />
  );
};
