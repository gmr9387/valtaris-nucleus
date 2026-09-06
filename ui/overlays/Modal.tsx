import React from "react";
import { OverlayPortal } from "./OverlayPortal";
import { colors, spacing, radius, effects } from "../tokens";

export const Modal = ({ open, onClose, children }) => {
  if (!open) return null;

  return (
    <OverlayPortal>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: colors.spaceBlack,
            padding: spacing.xl,
            borderRadius: radius.lg,
            boxShadow: effects.shadow.lg,
            minWidth: 400,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </OverlayPortal>
  );
};
