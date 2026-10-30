import { fileURLToPath, URL } from "node:url";
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
        resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
        test: { name: "app", include: ["src/**/*.test.ts"], environment: "node" },
      },
    ],
  },
});
