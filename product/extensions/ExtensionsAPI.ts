export const fetchExtensions = async () => {
  const res = await fetch("/api/extensions");
  return res.json();
};

export const installExtension = async (id: string) => {
  const res = await fetch(`/api/extensions/${id}/install`, {
    method: "POST"
  });
  return res.json();
};

export const removeExtension = async (id: string) => {
  const res = await fetch(`/api/extensions/${id}/remove`, {
    method: "POST"
  });
  return res.json();
};
