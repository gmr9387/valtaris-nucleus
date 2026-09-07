import React, { useEffect, useState } from "react";
import { securityEngine } from "./SecurityEngine";

export const SecurityPage = () => {
  const [packs, setPacks] = useState([]);

  useEffect(() => {
    securityEngine.load().then(() => {
      setPacks(securityEngine.getAll());
    });
  }, []);

  const install = async (id: string) => {
    await securityEngine.install(id);
    setPacks(securityEngine.getAll());
  };

  const remove = async (id: string) => {
    await securityEngine.remove(id);
    setPacks(securityEngine.getAll());
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Security Packs</h1>

      {packs.map((pack) => (
        <div key={pack.id} style={{ marginBottom: 20 }}>
          <div>{pack.name}</div>
          <div>{pack.description}</div>

          {pack.installed ? (
            <button onClick={() => remove(pack.id)}>Remove</button>
          ) : (
            <button onClick={() => install(pack.id)}>Install</button>
          )}
        </div>
      ))}
    </div>
  );
};
