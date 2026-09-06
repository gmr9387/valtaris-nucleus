import React from "react";
import { OverlayPortal } from "./OverlayPortal";
import { colors, spacing, radius, effects } from "../tokens";

export const Drawer = ({ open, onClose, side = "right", children }) => {
  if (!open) return null;

  const position = side === "right" ? { right: 0 } : { left: 0 };

  return (
    <OverlayPortal>
      <div
        style={{
          position: "fixed",
          top: 0,
          ...position,
          width: 360,
          height: "100vh",
          backgroundColor: colors.spaceBlack,
          boxShadow: effects.shadow.lg,
          padding: spacing.lg,
          zIndex: 9999,
        }}
      >
        {children}
      </div>

      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.4)",
          zIndex: 9998,
        }}
      />
    </OverlayPortal>
  );
};
