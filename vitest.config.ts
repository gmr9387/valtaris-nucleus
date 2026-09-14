import { defineConfig } from "vitest/config";

export default defineConfig({
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
