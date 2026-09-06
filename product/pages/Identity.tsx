import React, { useEffect, useState } from "react";
import { IdentityPage } from "../../ui/pages/IdentityPage";
import { fetchIdentities } from "../data/identity";

export const Identity = ({ navItems, active, onSelect }) => {
  const [identities, setIdentities] = useState([]);

  useEffect(() => {
    fetchIdentities().then(setIdentities);
  }, []);

  return (
    <IdentityPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      identities={identities}
    />
  );
};
