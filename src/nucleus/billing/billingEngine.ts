// src/nucleus/billing/billingEngine.ts
// Unified constitutional billing engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type BillingEvent = {
  id: string;
  org: string;
  subsystem: string;
  type: string; // e.g. "workflow.run", "pipeline.execute"
  units: number;
  unitCost: number;
  totalCost: number;
  metadata?: any;
  timestamp: number;
};

export type Invoice = {
  id: string;
  org: string;
  periodStart: number;
  periodEnd: number;
  events: BillingEvent[];
  total: number;
  generatedAt: number;
};

export class BillingEngine {
  private events: BillingEvent[] = [];
  private invoices: Invoice[] = [];

  recordEvent(
    org: string,
    subsystem: string,
    type: string,
    units: number,
    unitCost: number,
    metadata?: any
  ) {
    const totalCost = units * unitCost;

    const event: BillingEvent = {
      id: randomUUID(),
      org,
      subsystem,
      type,
      units,
      unitCost,
      totalCost,
      metadata,
      timestamp: Date.now(),
    };

    this.events.push(event);

    const prefix = `[BILLING][${subsystem.toUpperCase()}]`;
    console.log(prefix, `${type} → $${totalCost}`);

    return event;
  }

  generateInvoice(org: string, periodStart: number, periodEnd: number) {
    const events = this.events.filter(
      (e) => e.org === org && e.timestamp >= periodStart && e.timestamp <= periodEnd
    );

    const total = events.reduce((sum, e) => sum + e.totalCost, 0);

    const invoice: Invoice = {
      id: randomUUID(),
      org,
      periodStart,
      periodEnd,
      events,
      total,
      generatedAt: Date.now(),
    };

    this.invoices.push(invoice);

    console.log(`[BILLING][${org.toUpperCase()}] Invoice generated → $${total}`);

    return invoice;
  }

  getEvents(org?: string) {
    if (!org) return [...this.events];
    return this.events.filter((e) => e.org === org);
  }

  getInvoices(org?: string) {
    if (!org) return [...this.invoices];
    return this.invoices.filter((i) => i.org === org);
  }

  clearEvents() {
    this.events = [];
  }

  clearInvoices() {
    this.invoices = [];
  }
}

export const nucleusBilling = new BillingEngine();
