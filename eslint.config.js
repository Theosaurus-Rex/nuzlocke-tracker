import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "dexie",
              message:
                "Only src/storage/ may import Dexie directly. Import hooks from @/storage/queries instead.",
            },
            {
              name: "dexie-react-hooks",
              message:
                "Only src/storage/ may import Dexie directly. Import hooks from @/storage/queries instead.",
            },
          ],
          patterns: [
            {
              group: ["dexie/*", "dexie-react-hooks/*"],
              message:
                "Only src/storage/ may import Dexie directly. Import hooks from @/storage/queries instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/storage/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // shadcn/ui generates components that co-locate a cva() variants helper next
    // to the component export (e.g. `export { Button, buttonVariants }`). That is
    // upstream, regenerated-by-CLI code, not an app fast-refresh boundary.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  eslintConfigPrettier,
);
