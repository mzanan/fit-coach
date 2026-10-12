import { config } from "dotenv";
import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.config";

config({ path: ".env.local" });

const merged = mergeConfig(
  baseConfig,
  defineConfig({
    test: {
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

const dbConfig = { ...merged, test: { ...merged.test, include: ["src/**/*.dbtest.ts"] } };

export default dbConfig;
