# Lineage — Family Tree

A free, collaborative family tree app. Built with Next.js (React) + Prisma, deployable
on Vercel's free tier end‑to‑end (hosting **and** database).

## Features

- **Two parents, multiple children, multiple siblings** per person.
- **Polygamy-aware marriages** — a male node can be married to multiple female nodes.
- Build the tree outward from any person: **add parent / child / sibling / spouse**.
- Auto-laid-out tree on an open canvas (pan, zoom, drag), rendered with React Flow.
- **Male nodes are light blue, female nodes are light pink.**
- Each person has a name, year of birth, and sex assigned at birth (plus optional
  death year and notes).
- Accounts, multiple trees per user, and **invite-based collaboration** — a tree can
  be edited by everyone you invite (as Editor) or shared read-only (as Viewer).
- **Admin role**: the first account created becomes an admin and can see every tree
  in the system from `/admin`. Regular users only ever see their own trees.

## Stack

| Concern        | Choice                                   | Why |
|----------------|-------------------------------------------|-----|
| Framework      | Next.js 14 (App Router) + React           | One project, deploys natively to Vercel |
| Database       | **Neon Postgres** via Vercel's Storage tab | Free tier, serverless Postgres, zero config on Vercel |
| ORM            | Prisma                                    | Type-safe schema/migrations |
| Auth           | Auth.js / NextAuth (credentials)          | No paid OAuth app needed to get started |
| Tree rendering | React Flow + dagre                        | Auto-layout of a directed graph on a free-form canvas |

Total cost to run this for a family: **$0**. Vercel's Hobby plan and Neon's free
Postgres tier are both free indefinitely for this kind of usage.

## Data model (see `prisma/schema.prisma`)

- `User` — account, with a `systemRole` of `USER` or `ADMIN`.
- `Tree` — one family tree.
- `TreeMember` — join table: which users can access a tree, with role
  `OWNER` / `EDITOR` / `VIEWER`.
- `Invite` — a pending invitation to collaborate, by email.
- `PersonNode` — a person: `name`, `sex`, `birthYear`, `deathYear`, `notes`.
- `ParentChild` — a directed edge, parent → child. The app enforces **at most two**
  parent edges per child.
- `Marriage` — `husbandId` + `wifeId`. A husband can appear in many `Marriage` rows
  (polygamy); a wife appears in one unless remarried.

"Sibling" isn't its own table — adding a sibling simply creates a new person and
copies the current parent links, so siblings are just people who share parents.

## Local development

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL / DIRECT_URL / AUTH_SECRET
npx prisma db push        # creates tables in your database
npm run dev
```

Open http://localhost:3000. Register an account — **the first account created
becomes the admin**.

## Deploying for free (Vercel + Neon)

1. **Push this project to a GitHub repo.**

2. **Create the database.**
   - Go to [vercel.com](https://vercel.com) → your project (or create one by
     importing the repo first) → **Storage** tab → **Create Database** → choose
     **Neon** (Postgres) → pick the free plan → Create.
   - Vercel automatically adds `DATABASE_URL` and related env vars to your project.
     If a `DIRECT_URL` isn't added automatically, copy the same connection string
     Neon shows for a **non-pooled** connection into a `DIRECT_URL` env var (Prisma
     uses the pooled URL at runtime and the direct one for migrations).

3. **Add the remaining environment variables** in Vercel → Project → Settings →
   Environment Variables:
   - `AUTH_SECRET` — generate one with `npx auth secret` locally and paste the value.
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL, e.g. `https://your-app.vercel.app`.
   - `RESEND_API_KEY` — optional, only needed if you want actual invite emails sent
     (see below).

4. **Deploy.** Vercel will run `npm run build`, which runs `prisma generate` first
   (already wired up in `package.json`).

5. **Create the tables.** Prisma migrations aren't run automatically on deploy.
   Easiest one-time setup: run this locally once, pointed at your production
   database (paste the Vercel/Neon `DATABASE_URL` + `DIRECT_URL` into a local
   `.env`):
   ```bash
   npx prisma db push
   ```
   (For an evolving schema later, switch to `npx prisma migrate deploy` with real
   migration files instead of `db push`.)

6. Visit your deployed URL and register the first account — it becomes the admin.

### Sending real invite emails (optional)

Right now, inviting a collaborator by email always works — either they're added
immediately (if they already have an account) or a pending invite row is created
that resolves automatically the moment they register with that email. To also
**send** an email with the invite link, sign up for a free
[Resend](https://resend.com) account, add `RESEND_API_KEY`, and wire up a call to
Resend inside `src/app/api/trees/[id]/invite/route.ts` (there's a comment marking
exactly where). Until then, you can just copy the invite link
(`/invite/<token>`, visible via the pending invite) and send it yourself.

## Project structure

```
src/
  app/
    page.tsx                 # landing page
    login/, register/        # auth
    dashboard/                # "My Trees" — list + create
    tree/[id]/                # the tree canvas (view/edit)
    admin/                    # admin: all trees in the system
    invite/[token]/           # accept a collaboration invite
    api/                      # all backend routes (auth, trees, nodes, invites, admin)
  components/
    TreeCanvas.tsx            # React Flow canvas, selection panel, add/delete actions
    PersonNodeCard.tsx        # the blue/pink person card node
    AddPersonModal.tsx        # form for adding parent/child/sibling/spouse
    ManageCollaborators.tsx   # invite + member list
  lib/
    layout.ts                 # dagre auto-layout of the family graph
    access.ts                 # role/permission checks
    prisma.ts                 # Prisma client singleton
  auth.ts                      # Auth.js configuration
prisma/schema.prisma           # the data model
```

## A note on local verification

This project was built in a sandboxed environment without access to
`binaries.prisma.sh`, so `prisma generate` could not be run/tested here. This is a
sandbox network restriction, not a project issue — it will work normally on your
machine and on Vercel (both have full internet access). Run `npx prisma generate`
(or just `npm install`, which triggers it via `postinstall`) as your first step.
