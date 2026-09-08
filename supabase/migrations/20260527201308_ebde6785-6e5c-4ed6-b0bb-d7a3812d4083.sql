-- ============================================================
-- VALTARIS CORE PHASE 2 SECURITY + SCOPE PATCH
-- Purpose:
-- - Add missing relational constraints
-- - Enforce org/project/environment scope consistency
-- - Restrict direct client writes to credential_versions
-- - Preserve service-role/Edge Function secret-write pattern
-- ============================================================

-- =========================
-- FOREIGN KEYS
-- =========================

ALTER TABLE public.credentials
  ADD CONSTRAINT credentials_org_fk
  FOREIGN KEY (organization_id)
  REFERENCES public.organizations(id)
  ON DELETE CASCADE;

ALTER TABLE public.credentials
  ADD CONSTRAINT credentials_project_fk
  FOREIGN KEY (project_id)
  REFERENCES public.projects(id)
  ON DELETE CASCADE;

ALTER TABLE public.credentials
  ADD CONSTRAINT credentials_environment_fk
  FOREIGN KEY (environment_id)
  REFERENCES public.environments(id)
  ON DELETE CASCADE;

ALTER TABLE public.credentials
  ADD CONSTRAINT credentials_created_by_fk
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

ALTER TABLE public.credential_versions
  ADD CONSTRAINT credential_versions_created_by_fk
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

ALTER TABLE public.credential_rotation_events
  ADD CONSTRAINT credential_rotation_events_triggered_by_fk
  FOREIGN KEY (triggered_by)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

ALTER TABLE public.connector_bindings
  ADD CONSTRAINT connector_bindings_org_fk
  FOREIGN KEY (organization_id)
  REFERENCES public.organizations(id)
  ON DELETE CASCADE;

ALTER TABLE public.connector_bindings
  ADD CONSTRAINT connector_bindings_project_fk
  FOREIGN KEY (project_id)
  REFERENCES public.projects(id)
  ON DELETE CASCADE;

ALTER TABLE public.connector_bindings
  ADD CONSTRAINT connector_bindings_environment_fk
  FOREIGN KEY (environment_id)
  REFERENCES public.environments(id)
  ON DELETE CASCADE;

ALTER TABLE public.connector_bindings
  ADD CONSTRAINT connector_bindings_created_by_fk
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- =========================
-- SCOPE CONSISTENCY HELPERS
-- =========================

CREATE OR REPLACE FUNCTION public.environment_project(_environment_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id
  FROM public.environments
  WHERE id = _environment_id;
$$;

CREATE OR REPLACE FUNCTION public.is_project_in_org(_project_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = _project_id
      AND organization_id = _organization_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_environment_in_org(_environment_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.environments e
    JOIN public.projects p ON p.id = e.project_id
    WHERE e.id = _environment_id
      AND p.organization_id = _organization_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_environment_in_project(_environment_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.environments
    WHERE id = _environment_id
      AND project_id = _project_id
  );
$$;

CREATE OR REPLACE FUNCTION public.scope_matches_org_project_environment(
  _organization_id uuid,
  _project_id uuid,
  _environment_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _project_id IS NOT NULL
     AND NOT public.is_project_in_org(_project_id, _organization_id) THEN
    RETURN false;
  END IF;

  IF _environment_id IS NOT NULL
     AND NOT public.is_environment_in_org(_environment_id, _organization_id) THEN
    RETURN false;
  END IF;

  IF _environment_id IS NOT NULL
     AND _project_id IS NOT NULL
     AND NOT public.is_environment_in_project(_environment_id, _project_id) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- =========================
-- CONSTRAINT TRIGGER FUNCTION
-- =========================

CREATE OR REPLACE FUNCTION public.enforce_scope_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.scope_matches_org_project_environment(
    NEW.organization_id,
    NEW.project_id,
    NEW.environment_id
  ) THEN
    RAISE EXCEPTION 'Scope mismatch: project/environment does not belong to organization';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credentials_scope_consistency ON public.credentials;
CREATE TRIGGER trg_credentials_scope_consistency
  BEFORE INSERT OR UPDATE ON public.credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_scope_consistency();

DROP TRIGGER IF EXISTS trg_connector_bindings_scope_consistency ON public.connector_bindings;
CREATE TRIGGER trg_connector_bindings_scope_consistency
  BEFORE INSERT OR UPDATE ON public.connector_bindings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_scope_consistency();

-- =========================
-- CREDENTIAL VERSION HARDENING
-- =========================
-- The browser should never write secret versions directly.
-- Edge Functions/service_role should own create/rotate/deactivate secret version writes.

REVOKE INSERT, UPDATE, DELETE ON public.credential_versions FROM authenticated;

DROP POLICY IF EXISTS cv_insert_admins ON public.credential_versions;
DROP POLICY IF EXISTS cv_update_admins ON public.credential_versions;

-- Keep metadata read access for owner/admin/manager.
-- Existing SELECT policy remains valid.

-- Rotation event writes should also be server-owned.
REVOKE INSERT ON public.credential_rotation_events FROM authenticated;
DROP POLICY IF EXISTS cre_insert_admins ON public.credential_rotation_events;

-- =========================
-- CONNECTOR BINDING CREDENTIAL CONSISTENCY
-- =========================

CREATE OR REPLACE FUNCTION public.credential_org(_credential_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.credentials
  WHERE id = _credential_id;
$$;

CREATE OR REPLACE FUNCTION public.enforce_connector_binding_credential_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.credential_id IS NOT NULL THEN
    IF public.credential_org(NEW.credential_id) IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'Credential scope mismatch: credential does not belong to binding organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_connector_binding_credential_scope ON public.connector_bindings;
CREATE TRIGGER trg_connector_binding_credential_scope
  BEFORE INSERT OR UPDATE ON public.connector_bindings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_connector_binding_credential_scope();

-- =========================
-- FUNCTION EXECUTE HARDENING
-- =========================

REVOKE EXECUTE ON FUNCTION public.environment_project(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_project_in_org(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_environment_in_org(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_environment_in_project(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.scope_matches_org_project_environment(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_scope_consistency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credential_org(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_connector_binding_credential_scope() FROM PUBLIC, anon, authenticated;
