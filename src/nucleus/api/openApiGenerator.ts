// src/nucleus/api/openApiGenerator.ts
// Unified constitutional OpenAPI generator for the entire Valtaris ecosystem.

import type { Dynamic } from "../types/dynamic";
export type OpenApiRoute = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  subsystem: string;
  description: string;
  requestSchema?: Dynamic;
  responseSchema?: Dynamic;
};

export class OpenApiGenerator {
  private routes: OpenApiRoute[] = [];

  register(
    method: OpenApiRoute["method"],
    path: string,
    subsystem: string,
    description: string,
    requestSchema?: Dynamic,
    responseSchema?: Dynamic,
  ) {
    this.routes.push({
      method,
      path,
      subsystem,
      description,
      requestSchema,
      responseSchema,
    });

    const prefix = `[OPENAPI][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Documented: ${method} ${path}`);
  }

  generate() {
    const paths: Record<string, Dynamic> = {};

    for (const route of this.routes) {
      if (!paths[route.path]) {
        paths[route.path] = {};
      }

      paths[route.path][route.method.toLowerCase()] = {
        description: route.description,
        requestBody: route.requestSchema
          ? {
              content: {
                "application/json": {
                  schema: route.requestSchema,
                },
              },
            }
          : undefined,
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: route.responseSchema ?? {},
              },
            },
          },
        },
      };
    }

    const doc = {
      openapi: "3.0.0",
      info: {
        title: "Valtaris Unified API",
        version: "1.0.0",
      },
      paths,
    };

    console.log("[OPENAPI] Generated unified OpenAPI spec");
    return doc;
  }

  getRoutes() {
    return [...this.routes];
  }

  clear() {
    this.routes = [];
  }
}

export const nucleusOpenApi = new OpenApiGenerator();
