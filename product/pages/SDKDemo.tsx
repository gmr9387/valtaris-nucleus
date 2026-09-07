import React, { useEffect, useState } from "react";
import { useSDK } from "../sdk/useSDK";

export const SDKDemo = () => {
  const sdk = useSDK();
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    if (!sdk) return;
    sdk.workflows().then(setWorkflows);
  }, [sdk]);

  return (
    <div style={{ padding: 40 }}>
      <h1>SDK Demo</h1>

      {workflows.map((w) => (
        <div key={w.id} style={{ marginBottom: 10 }}>
          <span>{w.name}</span>
        </div>
      ))}
    </div>
  );
};
