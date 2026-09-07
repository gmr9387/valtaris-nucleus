import React, { useEffect, useState } from "react";
import { auditEngine } from "./AuditEngine";

export const AuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    auditEngine.load().then(() => {
      setLogs(auditEngine.getAll());
    });
  }, []);

  const select = async (id: string) => {
    await auditEngine.select(id);
    setSelected(auditEngine.getSelected());
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Audit Logs</h1>

      <div style={{ marginTop: 20 }}>
        {logs.map((log) => (
          <div key={log.id} style={{ marginBottom: 10 }}>
            <span>{log.action}</span>
            <button style={{ marginLeft: 10 }} onClick={() => select(log.id)}>
              View
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{ marginTop: 40 }}>
          <h2>Audit Entry</h2>
          <pre>{JSON.stringify(selected, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
