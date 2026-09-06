export const fetchMetrics = async () => {
  const res = await fetch("/api/monitoring");
  return res.json();
};
