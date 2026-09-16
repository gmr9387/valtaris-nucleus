// src/nucleus/api/apiServer.ts

import express from "express";
import bodyParser from "body-parser";
import { APIRouter } from "./apiRouter";
import { getInternalStatus } from "./internalStatusController";
import { renderInternalStatusPage } from "./internalStatusPage";

export class APIServer {
  static start(port: number = 3000) {
    const app = express();

    app.use(bodyParser.json());
    app.use("/api", APIRouter);

    // Human-facing counterpart to GET /api/internal-status. Mounted at
    // the app level rather than under /api since it's a page for a
    // person to open, not a machine endpoint -- and outside apiRouter.ts
    // specifically so it stays reachable even if that router's own
    // error-handling middleware below ever changes. The deployed admin
    // UI (the separate TanStack app) has no network path to this
    // process, so this is the only place this engine's real state is
    // actually visible in a browser.
    app.get("/status", async (_req, res) => {
      try {
        const status = await getInternalStatus();
        res.status(200).type("html").send(renderInternalStatusPage(status));
      } catch (err: unknown) {
        res
          .status(500)
          .type("html")
          .send(
            `<pre>Failed to compute internal status: ${err instanceof Error ? err.message : String(err)}</pre>`,
          );
      }
    });

    // FIXED: with no error-handling middleware registered, a parse
    // error from bodyParser.json() (malformed request body) fell
    // through to Express's default handler, which returns an HTML page
    // containing the full stack trace -- including internal filesystem
    // paths -- to the client. Every other error path in this API
    // returns clean JSON; this one didn't, and leaked internals on top
    // of it.
    app.use(
      (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error("[API] Unhandled error:", err);
        res.status(400).json({
          error: "Invalid request",
          details: err instanceof Error ? err.message : String(err),
        });
      },
    );

    app.listen(port, () => {
      console.log(`Valtaris API running on port ${port}`);
    });

    return app;
  }
}

// Alias matching the module-name convention deploymentProviders.ts uses
// (calls apiServer.start(), a static method, so this aliases the class itself).
export const apiServer = APIServer;
