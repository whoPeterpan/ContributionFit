import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import securityPlugin from "eslint-plugin-security";
import prettierConfig from "eslint-config-prettier";

/**
 * eslint.config.mjs — ESLint flat config with Next.js, TypeScript, security rules,
 * no-console restrictions, and Prettier integration.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      security: securityPlugin,
    },
    rules: {
      "no-console": "error",
      ...securityPlugin.configs.recommended.rules,
    },
  },
  {
    files: ["tests/**"],
    rules: {
      "security/detect-unsafe-regex": "off",
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-non-literal-regexp": "off",
    },
  },
  prettierConfig,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
]);

export default eslintConfig;
