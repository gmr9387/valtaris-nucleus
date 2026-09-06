import React, { useEffect, useState } from "react";
import { SettingsPage } from "../../ui/pages/SettingsPage";
import { fetchSettings } from "../data/settings";
import { updateSettings } from "../flows/updateSettings";

export const Settings = ({ navItems, active, onSelect }) => {
  const [settings, setSettings] = useState({ name: "" });

  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  const submit = async () => {
    await updateSettings({ name: settings.name });
  };

  return (
    <SettingsPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      form={{
        values: settings,
        errors: {},
        set: (field, value) => setSettings({ ...settings, [field]: value }),
        onSubmit: submit
      }}
    />
  );
};
