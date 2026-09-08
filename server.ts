// server.ts

import express from "express";
import { startNucleus } from "./src/nucleus/startNucleus";

const app = express();

// Boot Nucleus constitutionally
const organizationId = process.env.ORGANIZATION_ID || "dev-org";
startNucleus(organizationId);

// Start HTTP server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Valtaris Nucleus API server running on port ${port}`);
});
