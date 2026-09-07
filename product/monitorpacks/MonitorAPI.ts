export const fetchMonitorPacks = async () => {
  const res = await fetch("/api/monitorpacks");
  return res.json();
};

export const installMonitorPack = async (id: string) => {
  const res = await fetch(`/api/monitorpacks/${id}/install`, {
    method: "POST"
  });
  return res.json();
};

export const removeMonitorPack = async (id: string) => {
  const res = await fetch(`/api/monitorpacks/${id}/remove`, {
    method: "POST"
  });
  return res.json();
};
