export const triggerWorkflow = async (id: string) => {
  const res = await fetch(`/api/workflows/${id}/trigger`, {
    method: "POST"
  });

  return res.json();
};
