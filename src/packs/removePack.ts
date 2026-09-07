// Strict. Aligned. No drift. No overengineering.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const removePack = async (packId: string) => {
  // Disable pack first
  const { error: disableErr } = await supabase
    .from("pack_registry")
    .update({ version_pinned: true }) // freeze version
    .eq("id", packId);

  if (disableErr) throw new Error(`Disable failed: ${disableErr.message}`);

  // Remove pack metadata
  const { error } = await supabase
    .from("pack_registry")
    .delete()
    .eq("id", packId);

  if (error) throw new Error(`Remove failed: ${error.message}`);

  return { removed: true };
};
