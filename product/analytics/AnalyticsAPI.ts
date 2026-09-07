export const fetchAnalytics = async () => {
  const res = await fetch("/api/analytics");
  return res.json();
};

export const fetchUsage = async () => {
  const res = await fetch("/api/analytics/usage");
  return res.json();
};

export const fetchEvents = async () => {
  const res = await fetch("/api/analytics/events");
  return res.json();
};
