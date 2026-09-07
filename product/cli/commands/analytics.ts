import { ValtarisClient } from "../../sdk/client";
import { env } from "../../env";

export const analyticsCommand = async () => {
  const client = new ValtarisClient(env.api);
  const analytics = await client.analytics();

  console.log("Analytics Summary:");
  console.log(JSON.stringify(analytics, null, 2));
};
