import React, { useEffect, useState } from "react";
import { orgEngine } from "./OrgEngine";

export const OrgSwitcher = () => {
  const [orgs, setOrgs] = useState([]);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    orgEngine.load().then(() => {
      setOrgs(orgEngine.getAll());
      setCurrent(orgEngine.getCurrent());
    });
  }, []);

  const select = async (id: string) => {
    await orgEngine.select(id);
    setCurrent(orgEngine.getCurrent());
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>Organizations</h3>

      {orgs.map((org) => (
        <div key={org.id} style={{ marginBottom: 10 }}>
          <span>{org.name}</span>
          {current?.id === org.id ? (
            <span style={{ marginLeft: 10 }}>(current)</span>
          ) : (
            <button style={{ marginLeft: 10 }} onClick={() => select(org.id)}>
              Switch
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
