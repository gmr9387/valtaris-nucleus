import { env } from "./env";

export const api = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${env.api}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  return res.json();
};
