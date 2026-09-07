-- ============================================================
-- RPC: store identity
-- ============================================================

create or replace function rpc_store_identity(identity jsonb)
returns void
language plpgsql
as $$
begin
  insert into nucleus_identity (
    id,
    tenant_id,
    project_id,
    environment,
    actor,
    timestamp
  )
  values (
    (identity->>'id')::uuid,
    identity->>'tenant_id',
    identity->>'project_id',
    identity->>'environment',
    identity->'actor',
    now()
  );
end;
$$;


-- ============================================================
-- RPC: log event
-- ============================================================

create or replace function rpc_log_event(event jsonb)
returns void
language plpgsql
as $$
begin
  insert into nucleus_events (
    id,
    source,
    type,
    context,
    payload,
    timestamp
  )
  values (
    (event->>'id')::uuid,
    event->>'source',
    event->>'type',
    event->'context',
    event->'payload',
    now()
  );
end;
$$;


-- ============================================================
-- RPC: log telemetry
-- ============================================================

create or replace function rpc_log_telemetry(log jsonb)
returns void
language plpgsql
as $$
begin
  insert into nucleus_telemetry (
    id,
    subsystem,
    level,
    message,
    metadata,
    timestamp
  )
  values (
    (log->>'id')::uuid,
    log->>'subsystem',
    log->>'level',
    log->>'message',
    log->'metadata',
    now()
  );
end;
$$;


-- ============================================================
-- RPC: log error
-- ============================================================

create or replace function rpc_log_error(err jsonb)
returns void
language plpgsql
as $$
begin
  insert into nucleus_errors (
    id,
    subsystem,
    code,
    message,
    context,
    timestamp
  )
  values (
    (err->>'id')::uuid,
    err->>'subsystem',
    err->>'code',
    err->>'message',
    err->'context',
    now()
  );
end;
$$;


-- ============================================================
-- RPC: register subsystem
-- ============================================================

create or replace function rpc_register_subsystem(reg jsonb)
returns void
language plpgsql
as $$
begin
  insert into nucleus_subsystems (
    id,
    runtime,
    definition,
    health,
    telemetry,
    events,
    contracts,
    timestamp
  )
  values (
    reg->>'id',
    (reg->>'runtime')::boolean,
    (reg->>'definition')::boolean,
    (reg->>'health')::boolean,
    (reg->>'telemetry')::boolean,
    (reg->>'events')::boolean,
    (reg->>'contracts')::boolean,
    now()
  );
end;
$$;
