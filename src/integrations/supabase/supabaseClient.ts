// src/integrations/supabase/supabaseClient.ts
//
// Unified Supabase client binding for Nucleus.
//
// NOTE: there was an existing file at this path named "supabaseCLient"
// (odd casing, no .ts extension) -- confirmed via grep that nothing in
// the codebase actually imports it. Creating this correctly rather than
// building new code on top of an already-broken, unused file.

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);
