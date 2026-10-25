import { defineConfig } from "vitest/config";
import path from "path";

/**
 * vitest.config.ts — Testing configuration for pure logic & security checks.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
