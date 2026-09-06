import React, { createContext, useContext } from "react";
import { brand } from "./config";

const BrandContext = createContext(brand);

export const BrandProvider = ({ children }) => {
  return (
    <BrandContext.Provider value={brand}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => useContext(BrandContext);
