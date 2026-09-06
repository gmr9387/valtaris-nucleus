import React, { useEffect, useState } from "react";
import { SettingsPage } from "../../ui/pages/SettingsPage";
import { fetchSettings } from "../data/settings";

export const Settings = ({ navItems, active, onSelect }) => {
  const [settings, setSettings] = useState({ name: "" });

  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  return (
    <SettingsPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      form={{
        values: settings,
        errors: {},
        set: () => {},
        onSubmit: () => {},
      }}
    />
  );
};
