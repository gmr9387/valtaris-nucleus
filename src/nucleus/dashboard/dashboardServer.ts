// Phase 48 — Dashboard Server

import express from "express";
import { dashboardManifest } from "./dashboardManifest";
import { dashboardProviders } from "./dashboardProviders";
import { dashboardState } from "./dashboardState";
import type { Dynamic } from "../types/dynamic";

export class DashboardServer {
  app = express();

  constructor() {
    this.app.get("/", (req, res) => {
      dashboardState.lastRenderedAt = new Date().toISOString();
      res.send(`
        <html>
          <head>
            <title>${dashboardManifest.title}</title>
          </head>
          <body>
            <h1>${dashboardManifest.title}</h1>
            <p>Last rendered: ${dashboardState.lastRenderedAt}</p>
            <ul>
              <li><a href="/sovereignty">Sovereignty</a></li>
              <li><a href="/pipeline">Pipeline</a></li>
              <li><a href="/adapters">Adapters</a></li>
              <li><a href="/ci">CI</a></li>
              <li><a href="/activation">Activation</a></li>
              <li><a href="/federation">Federation</a></li>
              <li><a href="/autonomy">Autonomy</a></li>
              <li><a href="/resources">Resources</a></li>
              <li><a href="/lineage">Lineage</a></li>
              <li><a href="/telemetry">Telemetry</a></li>
            </ul>
          </body>
        </html>
      `);
    });

    for (const key of Object.keys(dashboardProviders)) {
      this.app.get(`/${key}`, async (req, res) => {
        const result = await (dashboardProviders as Dynamic)[key]();
        res.json(result);
      });
    }
  }

  start() {
    if (!dashboardManifest.enabled) {
      throw new Error("Dashboard disabled by manifest");
    }

    this.app.listen(dashboardManifest.port, () => {
      console.log(`🔵 Sovereign Dashboard running on port ${dashboardManifest.port}`);
    });
  }
}

export const dashboardServer = new DashboardServer();
