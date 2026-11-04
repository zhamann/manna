# Manna

Manna is a simple, fast, self-hosted recipe app. Organize recipes into sections, then follow them step by step in cook mode on your phone, tablet, or desktop.

## Features

- **Sections and recipes** in a sidebar: create, rename, and delete sections, and search recipes by title or section.
- **Recipes** with a description, servings, prep and cook times, a source link, ingredients, steps, and notes. The editor gives each ingredient and step its own row; press Enter for the next ingredient, and paste a whole list to split it into rows.
- **Cook mode** shows every step in a scrolling list with the current one centered, like song lyrics. Tap a step to jump to it, or use Previous/Next, the arrow keys, or space. Ingredients sit beside the steps on wide screens and in a drawer on phones. Each device remembers its place, and the screen stays awake while cooking (browsers only allow this over HTTPS or on `localhost`).
- **Backups** from Settings: export the whole library as JSON, or restore a backup to replace everything (ids are kept, so links keep working).

## Self-hosting

Run the published image with Docker Compose:

```bash
curl -O https://raw.githubusercontent.com/zhamann/manna/main/docker-compose.yml
docker compose up -d
```

Open http://localhost:4321. Recipes are stored in the `manna-data` volume; export a backup from Settings before moving or wiping it. Images are built for `linux/amd64` and `linux/arm64`.

The app has no accounts, so keep it on a private network or behind a reverse proxy that handles authentication. Serve it over HTTPS if you want cook mode to keep the screen awake.

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

## Releasing

Push a tag like `v1.2.3` to publish `ghcr.io/zhamann/manna` as `1.2.3`, `1.2`, and `latest`.

## License

[AGPL-3.0](LICENSE)
