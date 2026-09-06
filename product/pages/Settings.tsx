import React from "react";
import { SettingsPage } from "../../ui/pages/SettingsPage";

export const Settings = ({ navItems, active, onSelect }) => {
  return (
    <SettingsPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      form={{
        values: {},
        errors: {},
        set: () => {},
        onSubmit: () => {},
      }}
    />
  );
};
