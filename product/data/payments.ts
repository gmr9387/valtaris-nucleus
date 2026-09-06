export const fetchPayments = async () => {
  const res = await fetch("/api/payments");
  return res.json();
};
