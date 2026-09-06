import React, { useEffect, useState } from "react";
import { SecurityPage } from "../../ui/pages/SecurityPage";
import { fetchSecurityEvents } from "../data/security";

export const Security = ({ navItems, active, onSelect }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchSecurityEvents().then(setEvents);
  }, []);

  return (
    <SecurityPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      events={events}
    />
  );
};
