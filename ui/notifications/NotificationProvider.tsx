import React, { createContext, useContext } from "react";
import { useToasts } from "./useToasts";
import { ToastContainer } from "./ToastContainer";

const NotificationContext = createContext({
  push: (msg, type) => {},
});

export const NotificationProvider = ({ children }) => {
  const { toasts, push } = useToasts();

  return (
    <NotificationContext.Provider value={{ push }}>
      {children}
      <ToastContainer toasts={toasts} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
