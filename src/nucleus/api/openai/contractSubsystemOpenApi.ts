// src/nucleus/api/openapi/contractSubsystemOpenApi.ts
// Full file — OpenAPI Definition for Contract Subsystem Routes

export const ContractSubsystemOpenApi = {
  paths: {
    "/contract/{type}/{version}": {
      post: {
        summary: "Execute a contract subsystem operation",
        description:
          "Dispatches a contract operation such as opportunity, recommendation, authorization, execution, or payment.",
        tags: ["Contract Subsystems"],
        parameters: [
          {
            name: "type",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: ["opportunity", "recommendation", "authorization", "execution", "payment"],
            },
          },
          {
            name: "version",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                description: "Payload for the contract subsystem",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Contract executed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
          500: {
            description: "Contract execution failed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
