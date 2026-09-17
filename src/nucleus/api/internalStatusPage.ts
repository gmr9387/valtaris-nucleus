// src/nucleus/api/internalStatusPage.ts
//
// GET /api/internal-status (internalStatusController.ts) made the
// engine's real state queryable as JSON. Nothing renders it for a human
// to actually look at, and the deployed admin UI (the TanStack app,
// src/routes/_app.command-center.tsx) runs in a completely separate
// Cloudflare Workers deployment that talks to Supabase edge functions --
// it has no network path to this process at all, so a route added there
// wouldn't ever reach this data. This renders the same status as a
// single self-contained HTML page served directly by this Express
// process, so opening the internal engine (`bun nucleus-server.ts`) and
// visiting /status shows something real without depending on a
// deployment this engine has never had.

import type { getInternalStatus } from "./internalStatusController";
import type { Dynamic } from "../types/dynamic";

type InternalStatus = Awaited<ReturnType<typeof getInternalStatus>>;

function escapeHtml(value: Dynamic): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function badge(ok: boolean, label: string): string {
  const color = ok ? "#16a34a" : "#dc2626";
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${color};color:#fff;font-size:12px;font-weight:600;">${escapeHtml(label)}</span>`;
}

function section(title: string, body: string): string {
  return `
    <section style="margin-bottom:24px;padding:16px;border:1px solid #2a2a35;border-radius:8px;background:#14141c;">
      <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;">${escapeHtml(title)}</h2>
      ${body}
    </section>
  `;
}

export function renderInternalStatusPage(status: InternalStatus): string {
  const healthRows = status.health
    .map(
      (h) =>
        `<tr><td style="padding:4px 8px;">${escapeHtml(h.subsystem)}</td><td style="padding:4px 8px;">${badge(h.healthy, h.healthy ? "HEALTHY" : "UNHEALTHY")}</td><td style="padding:4px 8px;color:#6b7280;">${escapeHtml(h.lastCheckedAt)}</td></tr>`,
    )
    .join("");

  const metricsRows = status.metrics.recentPoints
    .slice()
    .reverse()
    .map(
      (p) =>
        `<tr><td style="padding:4px 8px;">${escapeHtml(p.org)}</td><td style="padding:4px 8px;">${escapeHtml(p.subsystem)}</td><td style="padding:4px 8px;">${escapeHtml(p.name)}</td><td style="padding:4px 8px;">${escapeHtml(p.value)}</td></tr>`,
    )
    .join("");

  const auditRows = Object.entries(status.audit.byAction ?? {})
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(
      ([action, count]) =>
        `<tr><td style="padding:4px 8px;">${escapeHtml(action)}</td><td style="padding:4px 8px;">${escapeHtml(count)}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Valtaris Nucleus — Internal Status</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { background:#0a0a0f; color:#e5e7eb; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; margin:0; padding:24px; }
  table { border-collapse:collapse; width:100%; font-size:13px; }
  th { text-align:left; padding:4px 8px; color:#9ca3af; border-bottom:1px solid #2a2a35; }
  h1 { font-size:20px; margin:0 0 4px; }
  .meta { color:#6b7280; font-size:12px; margin-bottom:24px; }
</style>
</head>
<body>
  <h1>Valtaris Nucleus — Internal Status</h1>
  <div class="meta">Generated ${escapeHtml(status.generatedAt)} · reload to refresh</div>

  ${section(
    "Subsystem Health",
    `<table><thead><tr><th>Subsystem</th><th>Status</th><th>Last checked</th></tr></thead><tbody>${healthRows}</tbody></table>`,
  )}

  ${section(
    "Governance",
    `<p>${badge(true, `${status.governance.totalDecisions} decisions`)} recorded (real-time enforcement of subsystem enabled/disabled on every dispatch).</p>`,
  )}

  ${section(
    "Certification",
    `<p>${badge(status.certification.certified, status.certification.certified ? "CERTIFIED" : "NOT CERTIFIED")} ${status.certification.lastCertifiedAt ? `as of ${escapeHtml(status.certification.lastCertifiedAt)}` : "(run the CLI's certify command)"}</p>
     <p style="color:#6b7280;font-size:12px;">${status.certification.proofs.map(escapeHtml).join(", ") || "no proofs recorded yet"}</p>`,
  )}

  ${section(
    "Adapters",
    `<p>${escapeHtml(status.adapters.loaded.length)} loaded: ${status.adapters.loaded.map(escapeHtml).join(", ") || "none yet"}</p>`,
  )}

  ${section(
    "Constitutional Pipeline",
    `<p>${badge(status.pipeline.completed, status.pipeline.completed ? "COMPLETED" : "NOT RUN")}</p>
     <p style="color:#6b7280;font-size:12px;">${status.pipeline.executedSteps.map(escapeHtml).join(" → ") || "no steps executed yet"}</p>`,
  )}

  ${section(
    "Sovereign CI",
    `<p>${badge(status.ci.completed, status.ci.completed ? "GREEN" : "NOT RUN")} ${status.ci.lastExecutedAt ? `last run ${escapeHtml(status.ci.lastExecutedAt)}` : ""}</p>`,
  )}

  ${section(
    "Deployment",
    `<p>${badge(status.deployment.deployed, status.deployment.deployed ? "DEPLOYED" : "NOT DEPLOYED")} services: ${status.deployment.services.map(escapeHtml).join(", ") || "none"}</p>`,
  )}

  ${section(
    "Federation",
    `<p>${escapeHtml(status.federation.nodes.length)} nodes, ${escapeHtml(status.federation.links.length)} links registered.</p>`,
  )}

  ${section(
    "Metrics (most recent)",
    `<table><thead><tr><th>Org</th><th>Subsystem</th><th>Name</th><th>Value</th></tr></thead><tbody>${metricsRows || `<tr><td colspan="4" style="padding:4px 8px;color:#6b7280;">no metrics recorded yet</td></tr>`}</tbody></table>`,
  )}

  ${section(
    "Audit (by action)",
    `<p style="color:#6b7280;font-size:12px;margin:0 0 8px;">${escapeHtml(status.audit.totalRecords)} total records</p>
     <table><thead><tr><th>Action</th><th>Count</th></tr></thead><tbody>${auditRows || `<tr><td colspan="2" style="padding:4px 8px;color:#6b7280;">no audit records yet</td></tr>`}</tbody></table>`,
  )}

  ${section(
    "Resources / Lineage / Telemetry",
    `<p>${escapeHtml(status.resources.total)} resources · ${escapeHtml(status.lineage.total)} lineage entries · ${escapeHtml(status.telemetry.total)} telemetry events</p>`,
  )}
</body>
</html>`;
}
