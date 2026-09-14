// src/server.ts — TanStack Start SSR entry (wrapped with error handling).
//
// vite.config.ts points tanstackStart.server.entry at "server", which
// resolves to this file. This is the request-handler TanStack Start's
// Cloudflare build actually invokes per-request -- unrelated to the
// long-running Express/Nucleus boot script at the repo root (server.ts),
// which is a separate deployment target entirely.

import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import type { RequestHandler } from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";

const handler = createStartHandler(defaultStreamHandler);

type ServerEntry = { fetch: RequestHandler<Register> };

function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
    async fetch(...args) {
      try {
        return await entry.fetch(...args);
      } catch (error) {
        console.error("[ssr] unhandled error", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    },
  };
}

export default createServerEntry({ fetch: handler });
