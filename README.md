# Job Bot

A small web app: you fill in your email, keywords, experience level, and target companies once.
It immediately emails you 25 matching job listings pulled from Greenhouse-powered company career
pages, then every day at 10am it emails you only the *new* listings that match, each with a short
"why this fits" note.

## Important — read before you build expectations

- **Job source: Greenhouse only, as requested.** LinkedIn, Indeed, and Handshake do not offer
  public job-search APIs available to individual developers (LinkedIn's is partner-only, Indeed
  shut its public API down in 2021, Handshake is closed to university/employer partners), so
  those three are not included. Greenhouse's public per-company API is real, free, and requires
  no API key — that's what this app uses.
- **Company coverage isn't universal.** Greenhouse has no public directory API, so there's no way
  to programmatically discover "every company on Greenhouse." The app pulls from a curated list of
  ~25 well-known Greenhouse boards (`lib/greenhouse.js`) plus whatever companies you type in
  (guessed as a URL slug — works for most, but isn't guaranteed for every company name). Add more
  slugs to `DEFAULT_BOARD_TOKENS` any time.
- **This must run as a real deployed app**, not inside a chat window — daily 10am autonomous
  emails require a server-side cron job, which only works once it's deployed on Vercel.
- **Fit summaries are rule-based, not AI-generated**, so the app has zero extra API costs or
  dependencies out of the box. If you want richer natural-language summaries, swap the logic in
  `buildFitSummary()` (`lib/matching.js`) for a call to the Claude API — see the commented note
  in that file's usage from the API routes.

## One-time setup

### 1. Supabase (database)
1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run everything in `supabase/schema.sql`.
3. Go to Project Settings → API and copy your **Project URL** and **service_role key** (not the
   anon key — the service role key is needed server-side to bypass row-level security).

### 2. Resend (email sending)
1. Sign up free at [resend.com](https://resend.com).
2. Verify a sending domain (or use their test domain while developing).
3. Create an API key.

### 3. Deploy to Vercel
1. Push this project to a GitHub repo.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. In the project's Environment Variables settings, add everything from `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `CRON_SECRET` (any long random string you make up)
4. Deploy.

Vercel automatically reads `vercel.json` and registers the daily cron job. Vercel's cron invoker
automatically sends `Authorization: Bearer <CRON_SECRET>` when it calls your route, matching the
check in `app/api/cron/daily-digest/route.js`.

### 4. Set your timezone
`vercel.json` schedules the cron for `0 14 * * *` — 14:00 UTC, which is 10:00am US Eastern time
(during EDT). Vercel cron schedules are always in UTC and don't auto-adjust for daylight saving,
so adjust the hour in `vercel.json` for your timezone/season, e.g.:
- 10am Eastern (EST, winter): `0 15 * * *`
- 10am Pacific (PDT, summer): `0 17 * * *`
- 10am Pacific (PST, winter): `0 18 * * *`

## Using it
1. Open your deployed URL.
2. Fill in email, keywords, experience level, and (optionally) target companies.
3. Click "Start my job search" — you'll see a success message and get your first email
   (25 listings) within a few seconds.
4. Every day at 10am, you'll get a new email with only newly discovered matches.

## Local development
```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```
To test the cron route locally without waiting for the schedule:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/daily-digest
```

## Project structure
```
app/
  page.js                     # onboarding form (frontend)
  api/onboard/route.js        # saves user + sends first email
  api/cron/daily-digest/route.js  # daily job, runs via Vercel Cron
lib/
  supabase.js                 # DB client
  greenhouse.js                # job fetching from Greenhouse public API
  matching.js                 # keyword/experience-level scoring + fit summaries
  email.js                    # Resend email sending + HTML template
supabase/schema.sql           # run this in Supabase once
vercel.json                   # cron schedule
```
