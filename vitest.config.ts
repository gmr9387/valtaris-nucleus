import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// The real app resolves "@/*" -> "./src/*" via @lovable.dev/vite-tanstack-config
// (see vite.config.ts) and tsconfig.json's "paths". Vitest doesn't load that
// preset, so without this alias any test that pulls in a module with a real
// (non-type-only) "@/..." import fails to resolve at runtime even though
// tsc and the production build are both fine with it.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/tests/**/*.test.ts", "src/nucleus/tests/**/*.test.ts"],
    coverage: {
      provider: "c8",
      reporter: ["text", "html"],
    },
  },
});
