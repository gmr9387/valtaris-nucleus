#!/usr/bin/env node

import { workflowsCommand } from "./commands/workflows";
import { triggerCommand } from "./commands/trigger";
import { analyticsCommand } from "./commands/analytics";
import { extensionsCommand } from "./commands/extensions";

const args = process.argv.slice(2);
const command = args[0];

(async () => {
  switch (command) {
    case "workflows":
      await workflowsCommand();
      break;

    case "trigger":
      await triggerCommand(args[1]);
      break;

    case "analytics":
      await analyticsCommand();
      break;

    case "extensions":
      await extensionsCommand();
      break;

    default:
      console.log("Valtaris CLI");
      console.log("Commands:");
      console.log("  workflows");
      console.log("  trigger <id>");
      console.log("  analytics");
      console.log("  extensions");
  }
})();
