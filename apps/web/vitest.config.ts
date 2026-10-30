import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
        test: { name: "worker", include: ["worker/**/*.spec.ts"] },
      },
      {
        test: { name: "app", include: ["src/**/*.test.ts"], environment: "node" },
      },
    ],
  },
});
