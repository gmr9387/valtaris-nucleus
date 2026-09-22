// src/nucleus/queue/queueDB.ts
//
// Service-role client for the queue's own durable store. Unlike
// src/nucleus/db/nucleusDB.ts (anon key, subject to RLS -- the only
// credential nucleus's own runtime has used until now), this module
// is only ever imported from src/nucleus/queue/* background-worker
// code, confirmed never bundled into a browser build, so a
// service-role key here never reaches a client. Mirrors the existing
// src/integrations/supabase/client.server.ts's supabaseAdmin pattern
// (same env vars, same lazy construction via Proxy) rather than
// introducing a third convention -- and lazy for the same reason that
// file is: importing this module (transitively, via queueEngine.ts,
// from plenty of code that never actually calls the queue) must not
// throw just because these env vars aren't set in a given process.
import { createClient } from "@supabase/supabase-js";

function createQueueClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY -- the durable queue requires a service-role client (see queueDB.ts).",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let _queueClient: ReturnType<typeof createQueueClient> | undefined;

export const queueClient = new Proxy({} as ReturnType<typeof createQueueClient>, {
  get(_, prop, receiver) {
    if (!_queueClient) _queueClient = createQueueClient();
    return Reflect.get(_queueClient, prop, receiver);
  },
});
