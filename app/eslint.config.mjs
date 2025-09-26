import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "import/no-default-export": "error",
    },
  },
  {
    files: [
      "**/page.tsx",
      "**/layout.tsx",
      "**/middleware.ts",
      "next.config.ts",
      "next.config.js",
      "next.config.mjs",
      "i18n.ts",
      "eslint.config.mjs",
      "postcss.config.mjs",
      "vitest.config.ts",
      "src/i18n/request.ts",
      "src/lib/dayjs.ts",
    ],
    rules: {
      "import/no-default-export": "off",
    },
  },
];

export default eslintConfig;
