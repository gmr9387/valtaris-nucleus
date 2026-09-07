export const fetchMarketplaceItems = async () => {
  const res = await fetch("/api/marketplace");
  return res.json();
};

export const installMarketplaceItem = async (id: string) => {
  const res = await fetch(`/api/marketplace/${id}/install`, {
    method: "POST"
  });
  return res.json();
};

export const removeMarketplaceItem = async (id: string) => {
  const res = await fetch(`/api/marketplace/${id}/remove`, {
    method: "POST"
  });
  return res.json();
};
