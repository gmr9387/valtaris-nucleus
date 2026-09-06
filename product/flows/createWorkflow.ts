export const createWorkflow = async (payload: { name: string; type: string }) => {
  const res = await fetch("/api/workflows/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return res.json();
};
