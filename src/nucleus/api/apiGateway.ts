// src/nucleus/api/apiGateway.ts
// Unified constitutional API gateway for the entire Valtaris ecosystem.

import http from "http";

export type ApiRoute = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  subsystem: string;
  handler: (req: any, res: any) => void;
};

export class ApiGateway {
  private routes: ApiRoute[] = [];
  private server: http.Server | null = null;

  registerRoute(
    method: ApiRoute["method"],
    path: string,
    subsystem: string,
    handler: ApiRoute["handler"]
  ) {
    this.routes.push({ method, path, subsystem, handler });

    const prefix = `[API][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Route registered: ${method} ${path}`);
  }

  start(port: number = 8080) {
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      const { method, url } = req;

      const route = this.routes.find(
        (r) => r.method === method && r.path === url
      );

      if (!route) {
        res.statusCode = 404;
        res.end("Route not found");
        return;
      }

      try {
        route.handler(req, res);
      } catch (err) {
        console.error(`[API] Error in route ${route.path}:`, err);
        res.statusCode = 500;
        res.end("Internal server error");
      }
    });

    this.server.listen(port, () => {
      console.log(`[API] Gateway running on port ${port}`);
    });
  }

  getRoutes() {
    return [...this.routes];
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

export const nucleusApi = new ApiGateway();
