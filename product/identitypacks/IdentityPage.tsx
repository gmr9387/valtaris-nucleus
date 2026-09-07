import React, { useEffect, useState } from "react";
import { identityEngine } from "./IdentityEngine";

export const IdentityPage = () => {
  const [packs, setPacks] = useState([]);

  useEffect(() => {
    identityEngine.load().then(() => {
      setPacks(identityEngine.getAll());
    });
  }, []);

  const install = async (id: string) => {
    await identityEngine.install(id);
    setPacks(identityEngine.getAll());
  };

  const remove = async (id: string) => {
    await identityEngine.remove(id);
    setPacks(identityEngine.getAll());
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Identity Packs</h1>

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
