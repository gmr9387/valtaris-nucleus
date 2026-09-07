import { ValtarisClient } from "../../sdk/client";
import { env } from "../../env";

export const extensionsCommand = async () => {
  const client = new ValtarisClient(env.api);
  const extensions = await client.extensions();

  console.log("Extensions:");
  extensions.forEach((ext: any) => {
    console.log(`- ${ext.id}: ${ext.name} (${ext.installed ? "installed" : "not installed"})`);
  });
};
