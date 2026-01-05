# StackTrack

StackTrack is a self-hosted IT service + ticket management platform.

This repo is a monorepo managed with `pnpm` workspaces (early development / proof of concept).

## Inspiration

Special shout-out to Peppermint — it’s been a genuine inspiration for this project. Their work helped shape how I think about a clean, approachable helpdesk experience, and I’m grateful for the time and care they’ve put into building and sharing it with the community.

## Repo structure

- `apps/frontend`: Next.js app (React + TypeScript + Tailwind CSS)
- `apps/backend`: Fastify API (TypeScript) + Prisma
- `packages/db`: Shared DB package placeholder
- `config`: Shared repo config (Prettier/TS)

## Features (current)

- Ticket CRUD, assignment, status/priority, internal-only tickets
- Clients
- Ticket timeline: comments/notes + basic activity entries
- Time tracking entries on tickets
- In-app notifications
- Auth (JWT) + sessions
- Roles + permissions (RBAC)
- Dark theme styles

## Roadmap (planned / in progress)

- Webhooks (API + delivery)
- Email-to-ticket
- Public API docs + versioning
- More automation/integrations (e.g. Node-RED)
- Docker Support

## One-command install / bootstrap (recommended)

This is the “fresh machine” installer for Debian/Ubuntu (including Proxmox LXC):

- Runs `apt-get update` (and optionally `apt-get upgrade`)
- Installs Node.js + `pnpm`
- Installs dependencies (`pnpm install`)
- Creates `apps/backend/.env` + `apps/frontend/.env.local` and generates secrets
- Installs/starts local PostgreSQL, creates the app role/database
- Runs Prisma generate + migrations + seed

From the repo root:

```bash
sudo bash scripts/install.sh --yes
```

If you see “Permission denied”, run it explicitly via `bash` (no execute bit required):

```bash
sudo bash scripts/install.sh
```

If you already have Node.js + `pnpm` installed and just want to (re)bootstrap the repo (no apt / no Node install):

```bash
pnpm bootstrap
```

## Reset / uninstall (local)

This removes generated env files, build artifacts, workspace `node_modules`, and (by default) drops the local Postgres db/role based on `apps/backend/.env`:

```bash
pnpm run uninstall -- --dry-run
pnpm run uninstall -- --yes
```

To keep the database, add `--skip-db`.

If `pnpm` isn’t available, you can run the script directly:

```bash
bash scripts/uninstall.sh --dry-run
```

## Upgrade

Pull the latest changes and re-run bootstrap:

```bash
bash scripts/upgrade.sh
```

Notes:

- By default the installer sets up a local Postgres database on `localhost:5432`. If you point `DB_HOST` at a remote database, role/database creation is skipped and Prisma may fail until you provision it yourself.

## Development

Run both apps:

```bash
pnpm dev
```

Or run individually:

```bash
pnpm dev:backend
pnpm dev:frontend
```

## Build + start (production)

```bash
pnpm build
pnpm start
```

## Database (Prisma)

You’ll need a Postgres database available (local install or hosted). Set `DATABASE_URL` in `apps/backend/.env`.

Run Prisma commands for the backend package:

```bash
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:migrate
pnpm --filter backend prisma:seed
```

Tip: The Prisma client is generated automatically during `pnpm install` and during the backend `pnpm build`, but you still need to run migrations before starting the backend.

## Lint / format

```bash
pnpm format
```

Note: `pnpm lint` runs each package's linter (e.g. `apps/backend`, `apps/frontend`).

## License

MIT. See `LICENSE`.
