export const updateRole = async (payload: { email: string; role: string }) => {
  const res = await fetch("/api/identity/role/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return res.json();
};
