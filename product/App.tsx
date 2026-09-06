import React from "react";
import { BrowserRouter } from "react-router-dom";

import { ThemeProvider } from "../ui/theme/ThemeProvider";
import { NotificationProvider } from "../ui/notifications/NotificationProvider";
import { SessionProvider } from "./auth/SessionProvider";
import { BrandProvider } from "./brand/BrandProvider";
import { AppRoutes } from "./routes";

export const App = () => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <SessionProvider>
          <BrandProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </BrandProvider>
        </SessionProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};
