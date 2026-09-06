import React from "react";
import { colors, spacing, radius, typography } from "../tokens";

export const DataTable = ({ columns, rows }) => {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        backgroundColor: colors.spaceBlack,
      }}
    >
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col}
              style={{
                textAlign: "left",
                padding: spacing.md,
                color: colors.valtarisBlue,
                fontFamily: typography.fontFamily.primary,
                fontSize: typography.sizes.md,
              }}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td
                key={col}
                style={{
                  padding: spacing.md,
                  borderTop: `1px solid ${colors.satelliteGray}`,
                  color: colors.white,
                  fontFamily: typography.fontFamily.secondary,
                }}
              >
                {row[col]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
