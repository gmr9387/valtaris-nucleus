import React from "react";
import { useTheme } from "../theme/ThemeProvider";

export const Page = ({ children, style = {} }) => {
  const { theme } = useTheme();

  return (
    <div
      style={{
        backgroundColor: theme.current.background,
        color: theme.current.foreground,
        minHeight: "100vh",
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
