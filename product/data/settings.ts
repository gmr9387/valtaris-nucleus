export const fetchSettings = async () => {
  const res = await fetch("/api/settings");
  return res.json();
};
