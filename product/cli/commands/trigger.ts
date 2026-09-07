import { ValtarisClient } from "../../sdk/client";
import { env } from "../../env";

export const triggerCommand = async (id: string) => {
  const client = new ValtarisClient(env.api);
  const result = await client.triggerWorkflow(id);

  console.log("Triggered workflow:", id);
  console.log(result);
};
