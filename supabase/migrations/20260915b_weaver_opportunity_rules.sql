-- ============================================================
-- WEAVER OPPORTUNITY-STAGE RULES — real, grounded bonus signals
-- ============================================================
-- The base opportunity score (claimPayload.amount / 20, clamped) stays
-- as intrinsic code -- it's a real continuous formula, not a business
-- toggle. These two rules add real, grounded bonuses on top, tied to
-- data-quality signals guardianRuntime.ts already tracks and exposes
-- (usedDemoContract / usedDemoPlan in the adjudication result): a claim
-- with a payer_name (and better still, a provider_npi) can actually be
-- adjudicated against a real contract/plan instead of falling back to
-- demo data, which makes it a genuinely higher-value opportunity to
-- process -- not an invented scoring heuristic.
-- ============================================================

insert into weaver_rules (stage, name, field_path, operator, value, weight) values
  ('opportunity', 'Payer identified', 'claimPayload.payer_name', 'nonempty_string', null, 10),
  ('opportunity', 'Provider identified', 'claimPayload.provider_npi', 'nonempty_string', null, 5);
