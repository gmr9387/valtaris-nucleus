// Regression coverage for findActiveContractIdForPayer()'s provider-tier
// preference (src/engine/contract-to-terms.ts). payer_contracts previously
// had no provider_npi column at all -- contracts were payer-level only.
// A provider-specific contract (row.provider_npi set) should now be
// preferred over a payer-level contract (provider_npi null) for the same
// payer/date, and a contract scoped to a *different* provider must never
// be used as a fallback -- that would silently apply someone else's
// negotiated rate.

import { describe, it, expect, vi } from "vitest";
import type { PayerContract } from "../types/contracts";

const listContracts = vi.fn<() => Promise<PayerContract[]>>();

vi.mock("@/lib/contracts", () => ({
  listContracts: () => listContracts(),
}));

const { findActiveContractIdForPayer } = await import("../engine/contract-to-terms");

function contract(overrides: Partial<PayerContract> & { contract_id: string }): PayerContract {
  return {
    payer_name: "Aetna",
    provider_npi: null,
    version: "1.0",
    effective_date: "2026-01-01",
    termination_date: null,
    reimbursement_method: "fee_schedule",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("findActiveContractIdForPayer — provider-tier preference", () => {
  it("returns any matching contract when no providerNpi is given (backward compatible)", async () => {
    listContracts.mockResolvedValueOnce([contract({ contract_id: "CTR-PAYER-LEVEL" })]);

    const id = await findActiveContractIdForPayer("Aetna", "2026-06-01");
    expect(id).toBe("CTR-PAYER-LEVEL");
  });

  it("prefers a provider-specific contract over a payer-level one", async () => {
    listContracts.mockResolvedValueOnce([
      contract({ contract_id: "CTR-PAYER-LEVEL", provider_npi: null }),
      contract({ contract_id: "CTR-PROVIDER-SPECIFIC", provider_npi: "1234567890" }),
    ]);

    const id = await findActiveContractIdForPayer("Aetna", "2026-06-01", "1234567890");
    expect(id).toBe("CTR-PROVIDER-SPECIFIC");
  });

  it("falls back to the payer-level contract when no provider-specific match exists", async () => {
    listContracts.mockResolvedValueOnce([contract({ contract_id: "CTR-PAYER-LEVEL" })]);

    const id = await findActiveContractIdForPayer("Aetna", "2026-06-01", "9999999999");
    expect(id).toBe("CTR-PAYER-LEVEL");
  });

  it("never falls back to a different provider's provider-specific contract", async () => {
    listContracts.mockResolvedValueOnce([
      contract({ contract_id: "CTR-OTHER-PROVIDER", provider_npi: "1111111111" }),
    ]);

    const id = await findActiveContractIdForPayer("Aetna", "2026-06-01", "9999999999");
    expect(id).toBeNull();
  });
});
