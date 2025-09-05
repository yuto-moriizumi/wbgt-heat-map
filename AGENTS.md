# Agent Instructions

## Build, Lint, and Test

- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Typecheck:** `npm run typecheck`

## E2E Test

- After completing a task, verify the functionality using Playwright MCP.

## Code Style

- **Framework:** Next.js, React, TypeScript
- **Styling:** Tailwind CSS
- **Formatting:** Follow existing code style.
- **Imports:** Use ES module imports.
- **Naming:**
  - Components: `PascalCase`
  - Files: `kebab-case` or `PascalCase`
- **Error Handling:** No specific patterns. Use standard try/catch blocks.
- **Internationalization (i18n):** Use `next-intl` for translations. Text is in `messages/{locale}.json`.
- **Data:** Static data is in `public/data`.
- **Components:** Reusable components are in `src/components`.
- **State Management:** No specific state management library. Use React's built-in state management.
- **Documentation:** Project documentation is stored in the `docs` directory in Markdown files.
