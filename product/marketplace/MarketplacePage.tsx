import React, { useEffect, useState } from "react";
import { marketplaceEngine } from "./MarketplaceEngine";

export const MarketplacePage = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    marketplaceEngine.load().then(() => {
      setItems(marketplaceEngine.getAll());
    });
  }, []);

  const install = async (id: string) => {
    await marketplaceEngine.install(id);
    setItems(marketplaceEngine.getAll());
  };

  const remove = async (id: string) => {
    await marketplaceEngine.remove(id);
    setItems(marketplaceEngine.getAll());
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Marketplace</h1>

      {items.map((item) => (
        <div key={item.id} style={{ marginBottom: 20 }}>
          <div>{item.name}</div>
          <div>{item.description}</div>

          {item.installed ? (
            <button onClick={() => remove(item.id)}>Remove</button>
          ) : (
            <button onClick={() => install(item.id)}>Install</button>
          )}
        </div>
      ))}
    </div>
  );
};
