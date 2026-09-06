export const addPaymentMethod = async (payload: { number: string; exp: string }) => {
  const res = await fetch("/api/payments/methods/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return res.json();
};
