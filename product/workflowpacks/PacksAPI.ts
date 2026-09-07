export const fetchWorkflowPacks = async () => {
  const res = await fetch("/api/workflowpacks");
  return res.json();
};

export const installWorkflowPack = async (id: string) => {
  const res = await fetch(`/api/workflowpacks/${id}/install`, {
    method: "POST"
  });
  return res.json();
};

export const removeWorkflowPack = async (id: string) => {
  const res = await fetch(`/api/workflowpacks/${id}/remove`, {
    method: "POST"
  });
  return res.json();
};
