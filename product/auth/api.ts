export const login = async (email: string, password: string) => {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return res.json();
};

export const fetchSession = async () => {
  const res = await fetch("/api/session");
  return res.json();
};
