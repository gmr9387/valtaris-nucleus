import React from "react";
import { colors } from "../tokens";

export const Checkbox = ({ checked, onChange }) => {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{
        width: 18,
        height: 18,
        accentColor: colors.valtarisBlue,
      }}
    />
  );
};
