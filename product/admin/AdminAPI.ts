export const fetchAdminStats = async () => {
  const res = await fetch("/api/admin/stats");
  return res.json();
};

export const fetchAdminUsers = async () => {
  const res = await fetch("/api/admin/users");
  return res.json();
};

export const updateAdminUser = async (id: string, role: string) => {
  const res = await fetch(`/api/admin/users/${id}/role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });

  return res.json();
};
