-- ============================================================
-- ENTERPRISE SSO — the other half of "multi tenancy, federation"
-- ("federation" here scoped to: enterprise SSO/SAML login, per
-- explicit clarification). Big-corp buyers expect their employees to
-- sign in through their own identity provider (Okta, Azure AD, ...),
-- not a Supabase email/password form.
--
-- Supabase has first-class SAML 2.0 SSO support -- provider
-- registration through its platform Management API (the same one
-- `supabase sso add` uses) and sign-in through the client-side
-- supabase.auth.signInWithSSO() -- this migration and its companion
-- manage-sso Edge Function wire nucleus into that, rather than
-- building a custom SAML stack from scratch.
--
-- IMPORTANT, two separate dormant gates: (1) SAML SSO is a Supabase
-- feature offered on Pro plan and above -- this project's org is
-- currently on the free plan. (2) On a hosted Supabase project,
-- registering a SAML provider is a platform-level Management API
-- operation (api.supabase.com, the same one `supabase sso add` uses),
-- authenticated with a personal access token -- NOT this project's
-- service-role key, which is all an Edge Function normally holds. See
-- supabase/functions/manage-sso/index.ts's header for the full
-- explanation and the SUPABASE_MANAGEMENT_API_TOKEN secret it needs.
-- Until both are satisfied, manage-sso's calls fail cleanly (an error
-- surfaced to the admin UI, stored on the row) rather than silently.
-- This migration and the surrounding code are deliberately safe to
-- ship in that dormant state -- no schema here depends on SSO
-- actually being enabled, and nothing in the existing auth flow
-- changes for non-SSO users.
-- ============================================================

create table public.organization_sso_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  -- Email domain that routes to this org's IdP, e.g. "acme.com". One
  -- domain claims exclusivity across the whole project (Supabase's own
  -- SSO domains are globally unique per project, not per-org), hence
  -- the UNIQUE constraint.
  domain text not null unique,
  -- Supabase's own SSO provider id, returned by the Management API's
  -- create-provider call. Null until the first successful
  -- registration succeeds.
  sso_provider_id uuid,
  status text not null default 'pending' check (status in ('pending', 'active', 'error')),
  last_error text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sso_configs_organization on public.organization_sso_configs (organization_id);

comment on table public.organization_sso_configs is
  'One row per organization opting into SAML SSO. domain routes signInWithSSO(); sso_provider_id/status track the Management API registration made by the manage-sso Edge Function.';

grant select, insert, update, delete on public.organization_sso_configs to authenticated;
grant all on public.organization_sso_configs to service_role;
alter table public.organization_sso_configs enable row level security;

-- Same owner/admin bar as manage-api-clients: this gates who can
-- point an email domain at an external identity provider for the
-- whole org, which is credential-adjacent, not day-to-day config.
create policy "sso_configs_select_admins" on public.organization_sso_configs for select to authenticated
  using (public.has_org_role(organization_id, auth.uid(), array['owner','admin']::public.app_role[]));
create policy "sso_configs_write_admins" on public.organization_sso_configs for all to authenticated
  using (public.has_org_role(organization_id, auth.uid(), array['owner','admin']::public.app_role[]))
  with check (public.has_org_role(organization_id, auth.uid(), array['owner','admin']::public.app_role[]));

create trigger trg_sso_configs_touch before update on public.organization_sso_configs
  for each row execute function public.touch_updated_at();

-- ---------- Auto-provisioning: SSO login -> organization_members ----------
-- A user who authenticates via a registered SAML IdP has already had
-- their identity verified by that IdP -- that is a stronger signal
-- than an unconfirmed email/password signup, so it's safe to
-- auto-join them to the org whose domain matches, as the lowest
-- privilege role (viewer). This must NOT fire for ordinary
-- email/password signups (an unverified "I work at acme.com" claim
-- during self-signup is not the same trust level), so it's gated on
-- the row's own provider being 'sso' -- the value GoTrue sets on
-- raw_app_meta_data.provider for SSO-authenticated users.
create or replace function public.handle_sso_user_org_provisioning()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_domain text;
  matched_org uuid;
begin
  if new.raw_app_meta_data->>'provider' is distinct from 'sso' then
    return new;
  end if;

  user_domain := lower(split_part(new.email, '@', 2));
  if user_domain = '' then
    return new;
  end if;

  select organization_id into matched_org
  from public.organization_sso_configs
  where domain = user_domain and status = 'active';

  if matched_org is not null then
    insert into public.organization_members (organization_id, user_id, role)
    values (matched_org, new.id, 'viewer')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created_sso_provisioning
  after insert on auth.users
  for each row execute function public.handle_sso_user_org_provisioning();
