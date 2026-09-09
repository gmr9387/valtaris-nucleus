// server.ts

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
