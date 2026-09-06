import { execSync } from "child_process";

console.log("Building Valtaris Product Layer...");
execSync("npm run build", { stdio: "inherit" });
console.log("Build complete.");
