-- ============================================================
-- GUARDIAN KILL SWITCH — real, persisted circuit breaker
-- ============================================================
-- Borrowed from rre-os-guardian's genuinely portable pattern: a
-- kill-switch is DB state, not UI/browser state, so it can't be
-- bypassed by refreshing a page or hitting the API directly, and it
-- survives a restart. A single global row is the whole surface for v1
-- -- per-organization kill switches are a real future extension, not
-- built here to keep this shippable and correct today.
--
-- guardianRuntime.ts checks this FIRST, before any adjudication work,
-- and fails closed (denies) if the switch's state can't be verified --
-- the same fail-closed convention already used for member-accumulator
-- fetch failures: if Guardian can't confirm the system is safe to run,
-- it does not guess "probably fine."
-- ============================================================

create table if not exists guardian_kill_switch (
  id text primary key default 'global',
  active boolean not null default false,
  reason text,
  activated_by text,
  updated_at timestamptz not null default now()
);

insert into guardian_kill_switch (id, active)
values ('global', false)
on conflict (id) do nothing;

alter table guardian_kill_switch enable row level security;

create policy "authenticated-rw-guardian-kill-switch" on guardian_kill_switch for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
