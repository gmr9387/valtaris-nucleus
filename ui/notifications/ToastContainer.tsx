import React from "react";
import { Toast } from "./Toast";

export const ToastContainer = ({ toasts }) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} />
      ))}
    </div>
  );
};
