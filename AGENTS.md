# Manna

Manna is a simple, fast, self-hosted recipe app. Recipes live in sections shown in a sidebar; each recipe has a lyrics-style cook mode for following steps while cooking. It must work well on phones, tablets, and desktops.

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
- Never edit files in `src/components/ui/` or `src/hooks/use-mobile.ts`; they must stay updatable through the CLI, so lint and Prettier skip them.
- App components compose shadcn components. Their own classes are limited to layout, spacing, and text size; no hand-built controls, menus, dialogs, or one-off colors.
- To style a link as a button, use `cn(buttonVariants({ ... }))`. `buttonVariants` alone doesn't resolve conflicting classes, so variants like `outline` lose their border.
- Theme changes belong in `src/styles/global.css` as tokens.
- The look is an olive grove: olive-leaf primary in light mode, olive-oil gold on a dark olive background in dark mode and cook mode. Use theme tokens (`primary`, `muted-foreground`, …), never raw colors.
- Display text (recipe titles, page and section headings, the wordmark, cook-mode steps) uses `font-heading` (Cardo); everything else uses the default sans.
- The logo is `src/components/manna-mark.tsx` and is mirrored in `public/favicon.svg`; keep the two in sync.
- Mutations are Astro Actions in `src/actions/`; they validate input with `astro/zod` and map `LibraryError` codes to user-facing messages. After a successful mutation the client reloads or navigates, so pages always render from the database.
- Every screen must work at phone, tablet, and desktop widths.

## Data

- SQLite through Node's built-in `node:sqlite`, stored at `$DATA_DIR/manna.db` (default `./data`).
- `src/server/library.ts` owns all reads and writes; the schema enforces the rules (unique section names, only empty sections can be deleted) and the library translates violations into `LibraryError` codes.
- Schema changes are new numbered files in `src/server/migrations/`, applied in order at startup. Never edit a shipped migration.
- Tests use Vitest against an in-memory database (`openDatabase(":memory:")`). Don't add Playwright as a dependency.

## Git and pull requests

- All changes land through pull requests; never push to `main`.
- Branch names: `<type>/<short-description>`, e.g. `feat/cook-mode`.
- PR titles and commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `build:`, `docs:`, `test:`, `refactor:`).
- PRs are squash-merged once CI passes.
- Each PR carries its own tests and README updates.
