# StackTrack

StackTrack is a self-hosted IT service + ticket management platform.

This repo is a monorepo managed with `pnpm` workspaces (early development / proof of concept).

## Repo structure

- `apps/frontend`: Next.js app (React + TypeScript + Tailwind CSS)
- `apps/backend`: Fastify API (TypeScript) + Prisma
- `packages/db`: Shared DB package placeholder
- `config`: Shared repo config (ESLint/Prettier/TS)

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
- SLA / business-hours logic

## Prerequisites

- Node.js (recommended: current LTS)
- `pnpm` (pinned via `packageManager` in `package.json`)

Optional: `corepack enable`

## Install

From the repo root:

```bash
pnpm install
```

## Environment setup

Run once from the repo root:

```bash
pnpm setup
```

This will:

- Create `apps/backend/.env` from `apps/backend/.env.example` (if missing) and generate `JWT_SECRET` + `COOKIE_SECRET`
- Create `apps/frontend/.env.local` from `apps/frontend/.env.example` (if missing)

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

Note: `pnpm lint` is not currently wired up (ESLint v9 flat config is not set up in this repo yet).

## License

MIT. See `LICENSE`.
