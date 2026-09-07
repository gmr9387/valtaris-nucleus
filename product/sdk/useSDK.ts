import { useEffect, useState } from "react";
import { ValtarisClient } from "./client";
import { env } from "../env";

export const useSDK = () => {
  const [sdk, setSDK] = useState<ValtarisClient | null>(null);

  useEffect(() => {
    const client = new ValtarisClient(env.api);
    setSDK(client);
  }, []);

  return sdk;
};
