# Recipes

A simple, fast, self-hosted recipe app. Recipes live in sections shown in a sidebar; each recipe has a lyrics-style cook mode for following steps while cooking. It must work well on phones, tablets, and desktops.

## Stack

- Astro 7 with server rendering (`@astrojs/node`, standalone) and React 19 islands for interactive UI.
- shadcn/ui, `base-luma` style (Base UI primitives), Tabler icons, Tailwind CSS 4.
- Node 26 (see `.node-version`), pnpm.

## Commands

- `pnpm dev`: start the dev server.
- `pnpm build` / `pnpm start`: build and run the production server.
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`: the checks CI runs.

## UI conventions

- Build UI from shadcn components. Add them with `pnpm dlx shadcn@latest add <name>`.
- Never edit files in `src/components/ui/`; they must stay updatable through the CLI.
- App components compose shadcn components. Their own classes are limited to layout, spacing, and text size; no hand-built controls, menus, dialogs, or one-off colors.
- Theme changes belong in `src/styles/global.css` as tokens.
- Every screen must work at phone, tablet, and desktop widths.

## Data

- SQLite through Node's built-in `node:sqlite`, stored at `$DATA_DIR/recipes.db` (default `./data`).
- `src/server/library.ts` owns all reads and writes; the schema enforces the rules (unique section names, only empty sections can be deleted) and the library translates violations into `LibraryError` codes.
- Schema changes are new numbered files in `src/server/migrations/`, applied in order at startup. Never edit a shipped migration.
- Tests use Vitest against an in-memory database (`openDatabase(":memory:")`). Don't add Playwright.

## Git and pull requests

- All changes land through pull requests; never push to `main`.
- Branch names: `<type>/<short-description>`, e.g. `feat/cook-mode`.
- PR titles and commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `build:`, `docs:`, `test:`, `refactor:`).
- PRs are squash-merged once CI passes.
- Each PR carries its own tests and README updates.
