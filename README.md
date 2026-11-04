# Recipes

A simple, fast, self-hosted recipe app. Organize recipes into sections, then follow them step by step in cook mode on your phone, tablet, or desktop.

## Features

- **Sections and recipes** in a sidebar: create, rename, and delete sections, and search recipes by title or section.
- **Recipes** with a description, servings, prep and cook times, a source link, ingredients, steps, and notes. The editor gives each ingredient and step its own row; press Enter for the next ingredient, and paste a whole list to split it into rows.

## Development

Requires Node 26 and pnpm.

```bash
pnpm install
pnpm dev
```

Open http://localhost:4321.

To run a production build:

```bash
pnpm build
pnpm start
```

## Configuration

| Variable   | Default     | Purpose                                         |
| ---------- | ----------- | ----------------------------------------------- |
| `DATA_DIR` | `./data`    | Folder holding the SQLite database              |
| `PORT`     | `4321`      | Port the production server listens on           |
| `HOST`     | `localhost` | Interface to bind; use `0.0.0.0` to expose it   |

## License

[AGPL-3.0](LICENSE)
