import { createFileRoute } from "@tanstack/react-router";
import ClaimsWorkbench from "@/pages/ClaimsWorkbench";

export const Route = createFileRoute("/_app/claims")({
  component: ClaimsWorkbench,
});
