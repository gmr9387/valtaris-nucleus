export const fetchSecurityEvents = async () => {
  const res = await fetch("/api/security");
  return res.json();
};
