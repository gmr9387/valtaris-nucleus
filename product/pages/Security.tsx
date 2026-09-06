import React from "react";
import { SecurityPage } from "../../ui/pages/SecurityPage";

export const Security = ({ navItems, active, onSelect }) => {
  return (
    <SecurityPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      events={[]}
    />
  );
};
