export const updateSettings = async (payload: { name: string }) => {
  const res = await fetch("/api/settings/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return res.json();
};
