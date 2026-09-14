/**
 * workflowRouterIntegration.ts
 *
 * Binds the Glue WorkflowAppRoot (Swap 70) into the Nucleus router.
 * This is the final integration layer for the workflow UI subsystem.
 */

import { router } from "../server/router";
import { WorkflowAppRoot } from "./workflowAppRoot";
import { renderToStream } from "../runtime/renderToStream"; // your existing SSR renderer

/**
 * Mount the workflow UI at /glue/workflows
 */
router.register({
  path: "/glue/workflows",
  method: "GET",
  handler: async (ctx, req) => {
    const userId = ctx.user?.id ?? "anonymous";

    const stream = await renderToStream(
      <WorkflowAppRoot userId={userId} />
    );

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/html"
      }
    });
  }
});
