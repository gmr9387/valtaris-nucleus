// Strict. Aligned. No drift. No overengineering.

import { createClient } from "@supabase/supabase-js";

export const supabaseFederation = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);
