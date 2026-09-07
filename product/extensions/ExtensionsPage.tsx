import React, { useEffect, useState } from "react";
import { extensionsEngine } from "./ExtensionsEngine";

export const ExtensionsPage = () => {
  const [extensions, setExtensions] = useState([]);

  useEffect(() => {
    extensionsEngine.load().then(() => {
      setExtensions(extensionsEngine.getAll());
    });
  }, []);

  const install = async (id: string) => {
    await extensionsEngine.install(id);
    setExtensions(extensionsEngine.getAll());
  };

  const remove = async (id: string) => {
    await extensionsEngine.remove(id);
    setExtensions(extensionsEngine.getAll());
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Extensions</h1>

      {extensions.map((ext) => (
        <div key={ext.id} style={{ marginBottom: 20 }}>
          <div>{ext.name}</div>
          <div>{ext.description}</div>

          {ext.installed ? (
            <button onClick={() => remove(ext.id)}>Remove</button>
          ) : (
            <button onClick={() => install(ext.id)}>Install</button>
          )}
        </div>
      ))}
    </div>
  );
};
