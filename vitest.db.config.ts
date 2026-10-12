import path from "node:path";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ".env.local" });

export default defineConfig({
  test: {
    include: ["src/**/*.dbtest.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/serverOnly.ts"),
    },
  },
});
