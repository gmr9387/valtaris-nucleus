// nucleus-server.ts
//
// The Nucleus/API backend process (long-running Node/Bun server, not a
// Cloudflare Workers fetch handler). Named distinctly from src/server.ts
// (the TanStack Start SSR entry that IS the Workers fetch handler) --
// having two files both literally named "server.ts" made Nitro's
// Cloudflare build pick up this one by convention and fail because it
// has no default `{fetch}` export, since it's meant to run as a normal
// process instead.

import { startNucleus } from "./src/nucleus/startNucleus";
import { APIServer } from "./src/nucleus/api/apiServer";

// Boot Nucleus constitutionally
const organizationId = process.env.ORGANIZATION_ID || "dev-org";
startNucleus(organizationId);

/**
 * FIXED: the previous version of this file built its own bare express()
 * app and called app.listen() directly, bypassing APIServer entirely.
 * That meant /api/claim and /api/health -- both fixed in earlier passes --
 * were never actually mounted on the server that runs in production.
 * APIServer.start() already wires up APIRouter (which includes both
 * routes) and calls app.listen() internally, so this replaces the
 * bare express app rather than running two servers side by side.
 */
const port = Number(process.env.PORT) || 3000;
APIServer.start(port);
