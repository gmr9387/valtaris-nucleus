import React, { createContext, useContext, useState } from "react";
import { valtarisTheme } from "./valtarisTheme";

const ThemeContext = createContext({
  theme: valtarisTheme,
  mode: "dark",
  setMode: (m: string) => {},
});

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState("dark");

  const theme = {
    ...valtarisTheme,
    current: valtarisTheme.modes[mode],
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
