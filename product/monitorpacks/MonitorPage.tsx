import React, { useEffect, useState } from "react";
import { monitorEngine } from "./MonitorEngine";

export const MonitorPage = () => {
  const [packs, setPacks] = useState([]);

  useEffect(() => {
    monitorEngine.load().then(() => {
      setPacks(monitorEngine.getAll());
    });
  }, []);

  const install = async (id: string) => {
    await monitorEngine.install(id);
    setPacks(monitorEngine.getAll());
  };

  const remove = async (id: string) => {
    await monitorEngine.remove(id);
    setPacks(monitorEngine.getAll());
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Monitoring Packs</h1>

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
