import React from "react";
import { IdentityPage } from "../../ui/pages/IdentityPage";

export const Identity = ({ navItems, active, onSelect }) => {
  return (
    <IdentityPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      identities={[]}
    />
  );
};
