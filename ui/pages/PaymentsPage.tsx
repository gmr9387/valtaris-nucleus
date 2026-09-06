import React from "react";
import { DashboardShell } from "../navigation/DashboardShell";
import { Panel } from "../dashboard/Panel";
import { PaymentItem } from "../dashboard/PaymentItem";

export const PaymentsPage = ({ navItems, active, onSelect, payments }) => {
  return (
    <DashboardShell navItems={navItems} active={active} onSelect={onSelect}>
      <Panel title="Payments">
        {payments.map((p) => (
          <PaymentItem
            key={p.id}
            id={p.id}
            amount={p.amount}
            currency={p.currency}
            status={p.status}
          />
        ))}
      </Panel>
    </DashboardShell>
  );
};
