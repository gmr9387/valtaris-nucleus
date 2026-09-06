export const fetchWorkflows = async () => {
  const res = await fetch("/api/workflows");
  return res.json();
};
