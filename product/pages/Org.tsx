import React from "react";
import { OrgSwitcher } from "../org/OrgSwitcher";

export const Org = () => {
  return (
    <div style={{ padding: 40 }}>
      <h1>Select Organization</h1>
      <OrgSwitcher />
    </div>
  );
};
