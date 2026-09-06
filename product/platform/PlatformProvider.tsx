import React, { useEffect } from "react";
import { realtime } from "./Realtime";
import { initNotifications } from "./Notifications";

export const PlatformProvider = ({ children }) => {
  useEffect(() => {
    realtime.connect("wss://api.valtaris.io/realtime");
    initNotifications();
  }, []);

  return <>{children}</>;
};
