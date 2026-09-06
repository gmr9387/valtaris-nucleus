import React from "react";
import { createPortal } from "react-dom";

export const OverlayPortal = ({ children }) => {
  const root = document.getElementById("valtaris-overlay-root");
  return createPortal(children, root);
};
