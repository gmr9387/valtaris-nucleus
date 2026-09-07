import React, { useEffect, useState } from "react";
import { packsEngine } from "./PacksEngine";

export const PacksPage = () => {
  const [packs, setPacks] = useState([]);

  useEffect(() => {
    packsEngine.load().then(() => {
      setPacks(packsEngine.getAll());
    });
  }, []);

  const install = async (id: string) => {
    await packsEngine.install(id);
    setPacks(packsEngine.getAll());
  };

  const remove = async (id: string) => {
    await packsEngine.remove(id);
    setPacks(packsEngine.getAll());
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Workflow Packs</h1>

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
