-- Closes the extension_in_public advisor finding: pgaudit was installed
-- directly in `public`, exposed via the PostgREST-facing schema
-- alongside real application tables/functions. Relocating it to a
-- dedicated `extensions` schema is the standard fix (extrelocatable
-- confirmed true) -- no functional change, pgaudit keeps auditing the
-- same way, its event-trigger functions still fire the same way. This
-- also fully closes the anon/authenticated SECURITY DEFINER exposure
-- findings for pgaudit_ddl_command_end/pgaudit_sql_drop (already
-- verified un-callable as event_trigger functions, but now also outside
-- the PostgREST-exposed schema entirely).
--
-- Already applied and verified live.
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pgaudit SET SCHEMA extensions;
