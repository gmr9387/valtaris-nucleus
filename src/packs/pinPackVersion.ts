// Strict. Aligned. No drift. No overengineering.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const pinPackVersion = async (packId: string) => {
  const { error } = await supabase
    .from("pack_registry")
    .update({ version_pinned: true })
    .eq("id", packId);

  if (error) throw new Error(`Pin failed: ${error.message}`);

  return { pinned: true };
};
