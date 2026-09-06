export const fetchIdentities = async () => {
  const res = await fetch("/api/identity");
  return res.json();
};
