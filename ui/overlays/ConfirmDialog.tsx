import React from "react";
import { Modal } from "./Modal";
import { Button } from "../components/Button";
import { spacing } from "../tokens/spacing";

export const ConfirmDialog = ({ open, onConfirm, onCancel, message }) => {
  return (
    <Modal open={open} onClose={onCancel}>
      <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
        <span>{message}</span>

        <div style={{ display: "flex", gap: spacing.md }}>
          <Button variant="primary" onClick={onConfirm}>
            Confirm
          </Button>
          <Button variant="gold" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
