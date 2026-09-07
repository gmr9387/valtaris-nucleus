export const fetchSecurityPacks = async () => {
  const res = await fetch("/api/securitypacks");
  return res.json();
};

export const installSecurityPack = async (id: string) => {
  const res = await fetch(`/api/securitypacks/${id}/install`, {
    method: "POST"
  });
  return res.json();
};

export const removeSecurityPack = async (id: string) => {
  const res = await fetch(`/api/securitypacks/${id}/remove`, {
    method: "POST"
  });
  return res.json();
};
