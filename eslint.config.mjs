import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".wrangler/**",
    "coverage/**",
    "out/**",
    "build/**",
    // Vendored, generated Tesseract.js worker and WASM runtime.
    "public/tesseract/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
