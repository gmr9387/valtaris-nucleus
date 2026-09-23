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
// gapMap.md flagged one more open question: "No live network topology
// beyond the one confirmed link -- Glue and rre-os-guardian have no
// confirmed real link to register yet." Checked directly by cloning
// both real repos and grepping for the real endpoint names/URL:
//   - valtaris-glue has a real, deployed-shaped Supabase Edge Function
//     (supabase/functions/execute-api/index.ts) with a "nucleus" service
//     entry that calls THREE of nucleus's real endpoints --
//     adjudicate-claim, weaver-score, and guardian-status -- against
//     this exact SUPABASE_PROJECT_URL, gated behind a real
//     NUCLEUS_API_KEY credential check (falling back to a mock response
//     when unset). Its own frontend (src/store/useApiStore.ts's
//     execute()) is a real caller of it, invoked as a generic
//     "service.action" workflow step -- the same evidentiary bar
//     already used for DualPay's link (real code calling the real
//     endpoint), not a guess.
//   - rre-os-guardian was also checked and has NO real link: its
//     "src/nucleus/subsystems/guardian/*" files matched the search only
//     because that's its own, unrelated legacy folder name -- zero
//     references anywhere in that repo to the real endpoint names or the
//     real Supabase project URL. Confirms the existing "legacy" status
//     below rather than finding anything new.
//
// CORRECTION (checked directly against both sides via Supabase MCP,
// not just source code): "real link" above meant "real code targeting
// the real endpoint," which is true for both -- but neither is
// currently carrying real production traffic, for two different
// reasons:
//   - DualPay: its Supabase project (ollsdgtduinxksvwmham) really does
//     have three deployed proxy functions (nucleus-adjudicate v6,
//     nucleus-weaver-score v5, nucleus-guardian-status v1) that hold
//     nucleus's API key server-side and forward to this repo's real
//     endpoints -- and matching client wrappers exist in DualPay's own
//     frontend (src/engine/nucleus-*-client.ts). But DualPay's actual
//     live UI (ClaimsWorkbench.tsx/Index.tsx/case-management.ts) still
//     calls its own local calculation engine, not these wrappers --
//     confirmed by reading those wrapper files' own header comments,
//     which say wiring a real call site in is "a separate, deliberate
//     decision" the codebase's owner hasn't made yet.
//   - valtaris-glue: its execute-api function really is deployed
//     (confirmed ACTIVE) with a real caller in its own frontend. But
//     nucleus's own api_clients table (the thing every real endpoint's
//     verifyApiKey checks) has exactly one row, for DualPay -- nucleus
//     has never issued valtaris-glue a credential. Its calls today run
//     in that function's own mock-response fallback (or fail auth, if
//     NUCLEUS_API_KEY is set to something else), not against real data.
// Both nodes' metadata below now says this precisely instead of
// implying real traffic flows.
//
// This registers exactly that -- no more, no less -- and does so
// idempotently (checked by name) so repeated boots don't pile up
// duplicate nodes, matching the pattern already used for governance
// rules, diagnostic checks, and certification checks.

import { federationEngine } from "./federationEngine";

const SUPABASE_PROJECT_URL = "https://qrqekucwdfyqqzomuble.supabase.co";

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
    note: "The app itself isn't deployed, but its Supabase project has three real, deployed proxy Edge Functions (nucleus-adjudicate, nucleus-weaver-score, nucleus-guardian-status) that forward to nucleus's real endpoints, with matching client wrappers in its own frontend. Not yet carrying real production traffic: DualPay's live UI still calls its own local calculation engine, not these wrappers -- confirmed by reading the wrappers' own header comments.",
  });

  const valtarisGlue = ensureNode(
    "valtaris-glue",
    "undeployed",
    "https://github.com/gmr9387/valtaris-glue",
    {
      deployed: false,
      kind: "source-repo",
      note: "The app itself isn't deployed, but its supabase/functions/execute-api Edge Function is deployed and ACTIVE with a real \"nucleus\" service connector (calling adjudicate-claim/weaver-score/guardian-status) and a real caller in its own frontend. A real api_clients credential for \"valtaris-glue\" now exists (issued via the same sha256(vnk_<client>_<32 random bytes>) scheme manage-api-clients uses, verified byte-for-byte against verifyApiKey()'s hash) -- once that raw key is set as this function's NUCLEUS_API_KEY secret in valtaris-glue's own Supabase project, its calls will reach real nucleus data instead of the mock fallback. That secret-setting step needs the project owner's Supabase dashboard/CLI access, not something this repo's tooling can do.",
    },
  );

  ensureNode("rre-os-guardian", "undeployed", "https://github.com/gmr9387/rre-os-guardian", {
    deployed: false,
    kind: "source-repo",
    status:
      "legacy -- Guardian's real authorization logic now lives in-process in this repo (src/nucleus/subsystems/guardian), not in this historical repo.",
  });

  const existingLinks = federationEngine.getLinks();

  const ensureLink = (sourceId: string, targetId: string) => {
    const alreadyLinked = existingLinks.some(
      (l) => l.sourceNode === sourceId && l.targetNode === targetId,
    );
    if (!alreadyLinked) {
      federationEngine.linkNodes(sourceId, targetId, "sync");
    }
  };

  ensureLink(dualpay.id, nucleus.id);
  ensureLink(valtarisGlue.id, nucleus.id);
}
