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
    // The storage boundary rule above (no-restricted-imports) is off here on purpose:
    // src/storage/** is the one place allowed to import Dexie directly.
    files: ["src/storage/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // Screens moved onto Typography. Add each screen here as it migrates.
    // See docs/design/block-shadow.md "Components".
    files: ["src/features/settings/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name=/^(h[1-6]|p)$/]",
          message: "Use <Typography> from @/components/typography for headings and paragraphs.",
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/text-\\[/]",
          message: "Arbitrary text sizes are not allowed here. Use a <Typography> variant.",
        },
      ],
    },
  },
  {
    // Migrated in PER-77. See docs/design/block-shadow.md "Components".
    // Test files keep their own placeholder route elements, which are allowed to stay plain.
    files: ["src/app/**/*.tsx"],
    ignores: ["src/app/**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name=/^(h[1-6]|p)$/]",
          message: "Use <Typography> from @/components/typography for headings and paragraphs.",
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/text-\\[/]",
          message: "Arbitrary text sizes are not allowed here. Use a <Typography> variant.",
        },
      ],
    },
  },
  {
    // Migrated in PER-77. See docs/design/block-shadow.md "Components".
    // Test files keep their own placeholder route elements, which are allowed to stay plain.
    files: ["src/features/run-list/**/*.tsx"],
    ignores: ["src/features/run-list/**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name=/^(h[1-6]|p)$/]",
          message: "Use <Typography> from @/components/typography for headings and paragraphs.",
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/text-\\[/]",
          message: "Arbitrary text sizes are not allowed here. Use a <Typography> variant.",
        },
      ],
    },
  },
  {
    // Migrated in PER-77. See docs/design/block-shadow.md "Components".
    // Test files keep their own placeholder route elements, which are allowed to stay plain.
    files: ["src/features/new-run/**/*.tsx"],
    ignores: ["src/features/new-run/**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name=/^(h[1-6]|p)$/]",
          message: "Use <Typography> from @/components/typography for headings and paragraphs.",
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/text-\\[/]",
          message: "Arbitrary text sizes are not allowed here. Use a <Typography> variant.",
        },
      ],
    },
  },
  {
    // Migrated in PER-77. See docs/design/block-shadow.md "Components".
    files: ["src/features/not-found/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name=/^(h[1-6]|p)$/]",
          message: "Use <Typography> from @/components/typography for headings and paragraphs.",
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/text-\\[/]",
          message: "Arbitrary text sizes are not allowed here. Use a <Typography> variant.",
        },
      ],
    },
  },
  {
    // StorageProvider and useStorage are deliberately co-located here, not split across two
    // files to satisfy fast-refresh's one-component-per-file heuristic.
    files: ["src/storage/storage-context.tsx"],
    rules: {
      "react-refresh/only-export-components": ["error", { allowExportNames: ["useStorage"] }],
    },
  },
  {
    // shadcn/ui generates components that co-locate a cva() variants helper with the
    // component export. That's upstream, CLI-regenerated code, not an app fast-refresh boundary.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // These helpers are co-located with the components that render them, so the table and
    // card list read the same mapping instead of keeping two copies.
    files: ["src/features/routes/route-presentation.tsx"],
    rules: {
      "react-refresh/only-export-components": [
        "error",
        {
          allowExportNames: [
            "STATUS_LABEL",
            "genderSymbol",
            "rowSpeciesId",
            "chipForRouteRow",
            "canLogEncounter",
            "rowTapAction",
            "routeBucket",
            "summariseRouteRows",
            "ROUTE_FILTER_BUCKETS",
            "filterRouteRows",
            "searchRouteRows",
          ],
        },
      ],
    },
  },
  {
    // describeReset is a pure message builder, exported for its own tests, co-located with the
    // dialog that calls it rather than split into a separate file.
    files: ["src/features/routes/reset-encounter-dialog.tsx"],
    rules: {
      "react-refresh/only-export-components": ["error", { allowExportNames: ["describeReset"] }],
    },
  },
  {
    // statusChipFill is StatusChip's own colour lookup, exported so other chip-style controls
    // reuse the one mapping instead of copying it.
    files: ["src/components/status-chip.tsx"],
    rules: {
      "react-refresh/only-export-components": ["error", { allowExportNames: ["statusChipFill"] }],
    },
  },
  eslintConfigPrettier,
);
