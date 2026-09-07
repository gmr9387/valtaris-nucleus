import { ValtarisClient } from "../../sdk/client";
import { env } from "../../env";

export const workflowsCommand = async () => {
  const client = new ValtarisClient(env.api);
  const workflows = await client.workflows();

  console.log("Workflows:");
  workflows.forEach((w: any) => {
    console.log(`- ${w.id}: ${w.name}`);
  });
};
