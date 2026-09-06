import React from "react";
import { BrowserRouter } from "react-router-dom";

import { ThemeProvider } from "../ui/theme/ThemeProvider";
import { NotificationProvider } from "../ui/notifications/NotificationProvider";
import { AppRoutes } from "./routes";

export const App = () => (
  <ThemeProvider>
    <NotificationProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </NotificationProvider>
  </ThemeProvider>
);
