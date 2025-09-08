# Agent Instructions

## Do checks after tasks

1. **Typecheck** `npm run typecheck`
1. **Test** `npm run test -- --run` - Ensure all tests pass after typecheck
1. **Lint** `npm run lint` - Fix all lint issues
1. **Unused exports** `npm run unused` and remove `export` keyword unless it's special one for Next.js
1. **Browser test** Verify the functionality using Playwright MCP.

Once all checks pass, you can consider the task complete.

## Where is documentation

Project documentation is stored in the `docs` directory in Markdown files.

## Don'ts

- `page.tsx` must be a Server Component. Do not add `"use client"` directive.
- Do not start the app with `npm run dev`. It must be already running.
