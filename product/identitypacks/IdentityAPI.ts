export const fetchIdentityPacks = async () => {
  const res = await fetch("/api/identitypacks");
  return res.json();
};

export const installIdentityPack = async (id: string) => {
  const res = await fetch(`/api/identitypacks/${id}/install`, {
    method: "POST"
  });
  return res.json();
};

export const removeIdentityPack = async (id: string) => {
  const res = await fetch(`/api/identitypacks/${id}/remove`, {
    method: "POST"
  });
  return res.json();
};
