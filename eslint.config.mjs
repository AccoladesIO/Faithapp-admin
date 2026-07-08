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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Jest config must use require()
    "jest.config.js",
  ]),
  {
    rules: {
      // Standard async-fetch-in-effect pattern is safe; this rule produces
      // false positives when the function called is async (state is set in a
      // promise callback, not synchronously in the effect body).
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
