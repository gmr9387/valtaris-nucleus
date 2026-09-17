// src/nucleus/federation/registerKnownTopology.ts
//
// FederationEngine.registerNode()/linkNodes()/forwardEvent() (gapMap.md's
// "Resource Federation Engine (formalized)", #15) were fully built with
// zero real callers -- only federationEngine.identity (a separate,
// already-live sub-engine) was ever exercised. Wiring the node/link
// methods was deliberately deferred earlier this session for a specific
// reason: there was no real topology data to register without inventing
// fake nodes.
//
// That data now exists, confirmed directly rather than assumed:
//   - gmr9387/valtaris-glue and gmr9387/Dualpay are real, separate repos
//     (confirmed via list_repos) -- Weaver and Guardian, by contrast,
//     are real business logic living in-process inside this repo
//     (src/nucleus/subsystems/weaver, /guardian), not separate services.
//   - Neither Glue nor DualPay's own applications are deployed anywhere
//     (confirmed directly with the user) -- so their real "location"
//     today is their source repo, not a live URL. Registering a fake
//     live endpoint for either would be exactly the fabrication this was
//     deferred to avoid.
//   - What IS actually deployed and live is a set of Supabase Edge
//     Functions (confirmed via list_edge_functions against this
//     project), including adjudicate-claim -- the real endpoint
//     DualPay's own code calls today (see the PR that wired it:
//     "Wire DualPay's side to call the real nucleus endpoint"). That is
//     a real, currently-live federation link, not a guess.
//
// This registers exactly that -- no more, no less -- and does so
// idempotently (checked by name) so repeated boots don't pile up
// duplicate nodes, matching the pattern already used for governance
// rules, diagnostic checks, and certification checks.

import { federationEngine } from "./federationEngine";

const SUPABASE_PROJECT_URL = "https://bpqukcsaoporhvdtfyza.supabase.co";

let registered = false;

export function registerKnownFederationTopology(): void {
  if (registered) return;
  registered = true;

  const existingByName = new Map(federationEngine.getNodes().map((n) => [n.name, n]));

  const ensureNode = (
    name: string,
    region: string,
    url: string,
    metadata: Record<string, unknown>,
  ) => existingByName.get(name) ?? federationEngine.registerNode(name, region, url, metadata);

  const nucleus = ensureNode("nucleus", "supabase-edge-functions", SUPABASE_PROJECT_URL, {
    deployed: true,
    kind: "edge-functions",
    functions: [
      "adjudicate-claim",
      "weaver-score",
      "guardian-status",
      "manage-api-clients",
      "command-center-stats",
      "manage-sso",
    ],
    note: "The internal constitutional engine (nucleus-server.ts, this repo's src/nucleus/*) is not deployed anywhere -- this node represents the real, live production adjudication surface instead: the Supabase Edge Functions this same repo deploys.",
  });

  const dualpay = ensureNode("dualpay", "undeployed", "https://github.com/gmr9387/Dualpay", {
    deployed: false,
    kind: "source-repo",
  });

  ensureNode("valtaris-glue", "undeployed", "https://github.com/gmr9387/valtaris-glue", {
    deployed: false,
    kind: "source-repo",
  });

  ensureNode("rre-os-guardian", "undeployed", "https://github.com/gmr9387/rre-os-guardian", {
    deployed: false,
    kind: "source-repo",
    status:
      "legacy -- Guardian's real authorization logic now lives in-process in this repo (src/nucleus/subsystems/guardian), not in this historical repo.",
  });

  const existingLinks = federationEngine.getLinks();
  const alreadyLinked = existingLinks.some(
    (l) => l.sourceNode === dualpay.id && l.targetNode === nucleus.id,
  );
  if (!alreadyLinked) {
    federationEngine.linkNodes(dualpay.id, nucleus.id, "sync");
  }
}
