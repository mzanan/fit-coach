import { config } from "dotenv";
import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.config";

config({ path: ".env.local" });

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["src/**/*.dbtest.ts"],
      fileParallelism: false,
      testTimeout: 60_000,
      hookTimeout: 60_000,
    },
    resolve: {
      alias: {
        "server-only": new URL("./src/test/serverOnly.ts", import.meta.url).pathname,
      },
    },
  }),
);
