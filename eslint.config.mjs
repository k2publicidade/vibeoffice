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
    ".worktrees/**",
    ".agent/**",
    "vibeoffice/**",
    "vibecanvas/**",
    "coverage/**",
    // Standalone/generated code is typechecked or linted separately, if needed.
    "supabase/functions/**",
    "vibe-distro-studio/**",
    "src/lib/supabase/database.types.ts",
  ]),
  {
    rules: {
      // Keep the gate focused on actionable issues while the codebase is being typed incrementally.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "prefer-const": "warn",
      // React Compiler diagnostics are useful, but too noisy to fail CI on this codebase today.
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react/display-name": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
]);

export default eslintConfig;
