// src/nucleus/subsystems/contracts/contractRouterBinding.ts
// Full file — Bind Contract Subsystem Router into Nucleus API Layer

// FIXED: real filename on disk is "contractSubsytemRouter.ts" (typo,
// missing 's' in "Subsytem"). This previously imported the correctly
// spelled "contractSubsystemRouter", which does not exist -- confirmed
// by actually running the boot chain, which failed with
// ERR_MODULE_NOT_FOUND at this exact line.
import { ContractSubsystemRouter } from "./contractSubsytemRouter";

export function bindContractSubsystemRoutes(app: any, organizationId: string) {
  const router = new ContractSubsystemRouter(organizationId);

  // -----------------------------
  // Contract Route Binding
  // -----------------------------
  app.post("/contract/:type/:version", async (req: any, res: any) => {
    try {
      const result = await router.handleRequest(req);
      res.status(result.status).json(result.data ?? { error: result.error });
    } catch (err: any) {
      res.status(500).json({
        error: err.message || "Contract subsystem routing failure",
      });
    }
  });
}
