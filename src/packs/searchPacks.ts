// Strict. Aligned. No drift. No overengineering.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export type PackSearchResult = {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  publisher: string;
};

type PackSearchFilters = {
  query?: string; // name/description search
  capability?: string;
  publisher?: string;
};

export const searchPacks = async (
  filters: PackSearchFilters
): Promise<PackSearchResult[]> => {
  let q = supabase
    .from("pack_registry")
    .select("id, name, version, description, capabilities, publisher");

  if (filters.query) {
    const like = `%${filters.query}%`;
    q = q.or(`name.ilike.${like},description.ilike.${like}`);
  }

  if (filters.capability) {
    q = q.contains("capabilities", [filters.capability]);
  }

  if (filters.publisher) {
    q = q.eq("publisher", filters.publisher);
  }

  const { data, error } = await q;

  if (error) {
    throw new Error(`Failed to search packs: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    version: row.version,
    description: row.description,
    capabilities: row.capabilities,
    publisher: row.publisher,
  }));
};
