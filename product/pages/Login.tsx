import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchSession } from "./api";

const SessionContext = createContext({
  user: null,
  org: null,
  loading: true,
});

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState({
    user: null,
    org: null,
    loading: true,
  });

  useEffect(() => {
    fetchSession().then((data) =>
      setSession({ user: data.user, org: data.org, loading: false })
    );
  }, []);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
