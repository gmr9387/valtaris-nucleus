// src/nucleus/api/apiServer.ts

import express from "express";
import bodyParser from "body-parser";
import { APIRouter } from "./apiRouter";

export class APIServer {
  static start(port: number = 3000) {
    const app = express();

    app.use(bodyParser.json());
    app.use("/api", APIRouter);

    app.listen(port, () => {
      console.log(`Valtaris API running on port ${port}`);
    });

    return app;
  }
}

// Alias matching the module-name convention deploymentProviders.ts uses
// (calls apiServer.start(), a static method, so this aliases the class itself).
export const apiServer = APIServer;
