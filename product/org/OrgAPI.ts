export const fetchOrgs = async () => {
  const res = await fetch("/api/orgs");
  return res.json();
};

export const switchOrg = async (id: string) => {
  const res = await fetch(`/api/orgs/${id}/switch`, {
    method: "POST"
  });
  return res.json();
};

export const fetchOrgDetails = async (id: string) => {
  const res = await fetch(`/api/orgs/${id}`);
  return res.json();
};
