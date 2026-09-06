import React, { useEffect, useState } from "react";
import { PaymentsPage } from "../../ui/pages/PaymentsPage";
import { fetchPayments } from "../data/payments";

export const Payments = ({ navItems, active, onSelect }) => {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchPayments().then(setPayments);
  }, []);

  return (
    <PaymentsPage
      navItems={navItems}
      active={active}
      onSelect={onSelect}
      payments={payments}
    />
  );
};
