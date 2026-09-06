import React from "react";
import { BrowserRouter } from "react-router-dom";

import { ThemeProvider } from "../ui/theme/ThemeProvider";
import { NotificationProvider } from "../ui/notifications/NotificationProvider";
import { SessionProvider } from "./auth/SessionProvider";
import { BrandProvider } from "./brand/BrandProvider";
import { PlatformProvider } from "./platform/PlatformProvider";
import { AppRoutes } from "./routes";

export const App = () => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <SessionProvider>
          <BrandProvider>
            <PlatformProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </PlatformProvider>
          </BrandProvider>
        </SessionProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};
