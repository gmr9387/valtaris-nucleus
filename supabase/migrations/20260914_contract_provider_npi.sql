-- ============================================================
-- PROVIDER-LEVEL CONTRACT TERMS
-- ============================================================
-- Closes the KNOWN GAP noted in @/engine/contract-to-terms.ts:
-- payer_contracts was payer-level only, with no way to represent that a
-- payer contracts differently with different providers. provider_npi is
-- nullable so every existing payer-level contract stays valid (null =
-- "applies to any provider billing this payer") -- a provider-specific
-- contract is simply a row with provider_npi set, and is preferred over
-- a payer-only match when both exist for the same payer/date.
-- ============================================================

alter table payer_contracts add column if not exists provider_npi text;

create index if not exists idx_payer_contracts_payer_provider
  on payer_contracts (payer_name, provider_npi);
