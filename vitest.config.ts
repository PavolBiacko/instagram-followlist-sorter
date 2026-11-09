import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgres://followlist:followlist@localhost:5432/followlist_test",
    },
    // API tests share one database, so run files one at a time.
    fileParallelism: false,
  },
});
