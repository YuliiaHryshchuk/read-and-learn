import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/*.puter.test.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "functions/**/*.ts"],
      exclude: ["**/*.d.ts", "functions/_shared/cloudflare.ts"],
    },
  },
});
