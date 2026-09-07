export const fetchAuditLogs = async () => {
  const res = await fetch("/api/audit");
  return res.json();
};

export const fetchAuditLog = async (id: string) => {
  const res = await fetch(`/api/audit/${id}`);
  return res.json();
};
