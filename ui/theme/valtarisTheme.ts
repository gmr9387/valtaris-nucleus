// ui/theme/valtarisTheme.ts

import { colors } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { radius } from "../tokens/radius";
import { typography } from "../tokens/typography";
import { effects } from "../tokens/effects";

export const valtarisTheme = {
  colors,
  spacing,
  radius,
  typography,
  effects,

  // Brand identity
  brand: {
    name: "Valtaris",
    primaryColor: colors.valtarisBlue,
    accentColor: colors.valtarisGold,
    background: colors.spaceBlack,
    foreground: colors.white,
  },

  // UI modes
  modes: {
    light: {
      background: "#FFFFFF",
      foreground: "#0A0A0F",
      card: "#F5F5F5",
      border: "#DDDDDD",
    },
    dark: {
      background: colors.spaceBlack,
      foreground: colors.white,
      card: colors.satelliteGray,
      border: "#1F1F27",
    },
  },

  // Layout system
  layout: {
    grid: {
      columns: 12,
      gutter: spacing.md,
      margin: spacing.lg,
    },
  },
};
