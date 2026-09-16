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

/**
 * FIXED: this used to call startNucleus() AND THEN APIServer.start()
 * itself again -- but startNucleus() -> DeploymentBootstrap.start()
 * already starts the API server internally. The second call tried to
 * bind the same port twice and crashed with EADDRINUSE ("Failed to
 * start server. Is port 3000 in use?") on every real run, confirmed by
 * actually booting this file rather than trusting the earlier fix's
 * own comment, which was wrong about this being resolved. The port is
 * now threaded through startNucleus() -> DeploymentBootstrap.start()
 * -> APIServer.start() instead of started here a second time.
 */
const organizationId = process.env.ORGANIZATION_ID || "dev-org";
const port = Number(process.env.PORT) || 3000;
startNucleus(organizationId, port).catch((err) => {
  console.error("Nucleus failed to start:", err);
  process.exit(1);
});
