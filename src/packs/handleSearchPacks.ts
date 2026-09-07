// Strict. Aligned. No drift. No overengineering.

import { searchPacks } from "./searchPacks";

export const handleSearchPacksRequest = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") ?? undefined;
  const capability = url.searchParams.get("capability") ?? undefined;
  const publisher = url.searchParams.get("publisher") ?? undefined;

  try {
    const results = await searchPacks({ query, capability, publisher });
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
