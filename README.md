This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Spectator count

Set `NEXT_PUBLIC_SUPABASE_URL` to the Supabase project URL and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to its public anon or publishable key. Use the same project as the followers feature. Add the values to `.env.local` for local development or to the Vercel project's environment variables before building and deploying.

The header uses Supabase Realtime Presence with public channel access. No SQL migration, service role key, or Redis database is needed for this feature. Each hostname has its own live count, and tabs in the same browser profile share an anonymous key when browser storage is available. Presence is temporary and does not store historical visits.

## Admin CMS

The Journal is a database-driven CMS at `/admin` (Supabase-backed), not source-controlled MDX.

### 1. Apply the database schema

This machine can't reach your Supabase project's Postgres connection directly, so run these yourself in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new), in order:

1. `supabase/migrations/0007_cms_core.sql` — posts, categories, tags, profiles, RLS
2. `supabase/migrations/0008_cms_media.sql` — media table + the `media` Storage bucket
3. `supabase/migrations/0009_analytics_events.sql` — custom analytics events table

### 2. Set environment variables

Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and a random `CRON_SECRET` (`openssl rand -hex 32`). Add the same variables to the Vercel project before deploying, and add `CRON_SECRET` there too so Vercel Cron can call the scheduled-publishing endpoint.

### 3. Create your admin account

```bash
npm run cms:create-admin -- you@example.com "Your Name"
```

This prints a temporary password. Log in at `/admin/login`, then use "Forgot your password?" to set your own. Only accounts with a row in `profiles` can access the CMS — there's no public sign-up.

### 4. Migrate the existing articles (optional)

The two existing MDX articles in `src/content/journal` can be moved into the database:

```bash
npm run cms:migrate-posts
```

Verify them at `/journal`, then you can delete `src/content/journal` and `src/lib/journal.ts` — nothing else references them.

### 5. Scheduled publishing

`vercel.json` runs `/api/admin/scheduled-publishing` every 5 minutes via Vercel Cron, authenticated with `CRON_SECRET`. Locally, nothing publishes scheduled posts automatically — call that endpoint yourself with the right bearer token, or just publish immediately instead of scheduling while developing.

### What's still manual

- **Projects** (`/projects`) are still source-controlled in `src/data/projects.ts`, not database-driven — only Journal articles moved to the CMS.
- **Traffic/audience analytics** (visitors, sources, devices) aren't wired into the dashboard — Vercel Web Analytics' Hobby plan has no API for historical data. Custom event tracking (`page_view`, etc.) is in place via `/api/track` → `analytics_events`, but the dashboard doesn't chart it yet.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
