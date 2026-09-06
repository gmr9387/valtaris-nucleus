import React from "react";
import { PaymentsPage } from "../../ui/pages/PaymentsPage";

export const Payments = ({ navItems, active, onSelect }) => {
  return (
    <PaymentsPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      payments={[]}
    />
  );
};
