# Followlist Sorter

Sort your Instagram followers and following into groups with drag and drop, and see how big each group is.

- Upload your Instagram data export (ZIP or JSON). It's parsed in the browser; only usernames and follow dates are sent to the server.
- Browse everyone with filters: followers, following, mutual, not following back, you don't follow.
- Create groups with a name and a muted color, then drag people in. One person can be in several groups. The badge on an avatar shows how many groups that person is in; click it to see them or change them.
- The Stats page shows list totals and people per group.
- No login. Each upload gets a private link (`/w/<uuid>`). Anyone with the link can view and edit, so share it carefully. You can delete everything from the header.
- Upload a newer export with **Update export**. Groups are kept; people who left both lists are removed.

## Why an export and not the Instagram API

Instagram's official API doesn't return follower or following lists, only counts, and only for business and creator accounts. Scraping is against Instagram's terms and can get an account restricted. The data export is the official, legal way to get the lists. It doesn't include profile photos, so avatars are generated from usernames. The `account.avatar_url` column is ready for photos if a legal source is added later.

### Getting the export

1. In Instagram, open **Accounts Center → Your information and permissions → Export your information**.
2. Create an export to your device and pick only **Followers and following**.
3. Set **Date range: All time** and **Format: JSON**.
4. Download the ZIP when Instagram says it's ready and drop it into the app.

`samples/demo-instagram-export.zip` is a fake export with 485 accounts for trying the app.

## Stack

Next.js 16 (App Router, route handlers) · React 19 · TypeScript · PostgreSQL · Drizzle ORM · TanStack Query · dnd-kit · Zod · Vitest

## Run it

### With Docker (everything)

```bash
docker compose up --build
```

Open http://localhost:3000. Migrations run automatically when the server starts.

### For development

```bash
docker compose up -d db          # Postgres on localhost:5432
cp .env.example .env
npm install
npm run dev                      # http://localhost:3000
```

### Tests

The API tests run against a real Postgres database named `followlist_test` (override with `TEST_DATABASE_URL`).

```bash
docker compose exec db createdb -U followlist followlist_test   # once
npm test
npm run typecheck
```

## Deploy to Render

`render.yaml` is a Render Blueprint: a Docker web service plus a managed Postgres, wired through `DATABASE_URL`.

1. Push this folder to a GitHub or GitLab repository.
2. In Render: **New → Blueprint**, pick the repository, confirm.

The blueprint uses free plans. A free web service sleeps when idle, and Render's free Postgres is time-limited, so move the database to a paid plan if you want to keep your groups.

Any other host that runs a Dockerfile works too (Fly.io, Railway, a VPS). Set `DATABASE_URL` and expose port 3000 (or set `PORT`).

## Project structure

```
src/
  app/
    page.tsx                  upload screen
    w/[id]/                   workspace: overview and stats pages
    api/workspaces/...        REST route handlers
  components/
    upload/                   upload form and dropzone
    workspace/                header, loading/error shell, workspace context
    overview/                 account list, group board, drag and drop
    stats/                    totals and the per-group chart
  lib/
    instagram-export.ts       export parser (browser), with tests
    contracts.ts              request schemas and response types shared by client and server
    api-client.ts             typed fetch wrapper
    workspace-queries.ts      TanStack Query hooks with optimistic updates
  server/
    db/                       Drizzle schema, client, migrations runner
    workspaces.ts, groups.ts  data access
    http.ts                   error handling and validation helpers
    api.test.ts               API integration tests
  instrumentation.ts          runs migrations on server start
drizzle/                      SQL migrations (generate with `npm run db:generate`)
```

## API

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| POST | `/api/workspaces` | `{ ownerUsername?, followers, following }` | 201, workspace |
| GET | `/api/workspaces/:id` | | workspace with accounts and groups |
| POST | `/api/workspaces/:id/import` | same as create | workspace (groups kept) |
| DELETE | `/api/workspaces/:id` | | 204 |
| POST | `/api/workspaces/:id/groups` | `{ name, color }` | 201, group |
| PATCH | `/api/workspaces/:id/groups/:groupId` | `{ name?, color? }` | group |
| DELETE | `/api/workspaces/:id/groups/:groupId` | | 204 |
| PUT | `/api/workspaces/:id/groups/:groupId/members/:username` | | 204, idempotent |
| DELETE | `/api/workspaces/:id/groups/:groupId/members/:username` | | 204, idempotent |
| GET | `/api/health` | | `{ status: "ok" }` |

Errors use problem details: `{ status, title, detail }`, where `detail` is written for the user.

## Changing the schema

Edit `src/server/db/schema.ts`, then run `npm run db:generate` to create a new migration in `drizzle/`. It's applied on the next server start.
