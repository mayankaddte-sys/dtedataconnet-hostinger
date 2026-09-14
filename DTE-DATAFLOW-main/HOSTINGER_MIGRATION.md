# Migrating this project from Supabase to Hostinger (MySQL + Express)

This repo now contains a full Express + MySQL backend that replaces Supabase,
plus a drop-in frontend client so almost none of your existing app code had
to change.

## What changed in the frontend

Only the import line in 3 files:
- `src/lib/storage.ts`
- `src/lib/emailPasswordReset.ts`
- `src/lib/emailReminderEngine.ts`

```diff
- import { supabase } from './supabaseClient';
+ import { apiClient as supabase } from './apiClient';
```

Everything else in those files — `.from(table).select()`, `.upsert()`,
`.delete().eq()`, `.rpc()`, `.functions.invoke()` — works unchanged because
`src/lib/apiClient.ts` implements the same call shapes against the new
backend instead of Supabase.

`src/lib/supabaseClient.ts` and the `@supabase/supabase-js` dependency are
no longer used — safe to remove once you've confirmed everything works
(left in place for now in case you want to compare/rollback).

## What's new (backend)

```
config/db.js          MySQL connection pool
backend-lib/           API key gate, table definitions, mailer
routes/generic.js      Generic REST CRUD for all 7 tables
routes/rpc.js          Replaces verify_password_any / save_password_any
routes/functions.js    Replaces the 'send-email' Edge Function
server.js              Express entry point — THIS is what fixes the
                        "node server.js: no match" Hostinger error
seed/schema.sql         MySQL table definitions (includes extension_requests,
                        which your code references but wasn't in your
                        original Supabase export)
seed/run-schema.js       Applies schema.sql to your Hostinger DB
seed/convert-supabase-dump.js   Converts Supabase *_rows.sql exports to
                                 MySQL-compatible INSERT statements
```

## Step-by-step migration

### 1. Provision the database
In Hostinger → Databases → create a MySQL database. Note the host, port,
database name, username, password it gives you.

### 2. Set environment variables
Copy `.env.example` to `.env` and fill in:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — from step 1
- `API_KEY` — make up a long random string (this replaces the Supabase
  anon key as a shared secret between frontend and backend)
- `SMTP_*` / `FROM_EMAIL` — your Gmail SMTP details (App Password, not
  your normal Gmail password) for password-reset OTP emails

In Hostinger's **Environment Variables** section for the site, also add
these same values, since your `.env` file won't be committed to git.

### 3. Install dependencies and apply the schema
```bash
npm install
npm run migrate:schema
```
This creates all 7 tables (`directorate_desks`, `field_units`,
`app_credentials`, `requisitions`, `submissions`, `extension_requests`,
`defaulter_notices`) with correct foreign keys.

### 4. Migrate your existing data
Export your current tables from Supabase's Table Editor (the same
`*_rows.sql` format you already have), place them in `seed/raw/`, then:
```bash
npm run migrate:data
```
This writes MySQL-ready INSERT files to `seed/converted/`. Import them via
phpMyAdmin (or `mysql < file.sql`) in this order, since foreign keys point
parent → child:
1. `directorate_desks.sql`
2. `field_units.sql`
3. `app_credentials.sql`
4. `requisitions.sql`
5. `submissions.sql`
6. `extension_requests.sql` (if you have this exported — it wasn't in your
   original files, since it's referenced in code but you may not have
   exported it yet)
7. `defaulter_notices.sql`

**Test this on a copy of the database first** before running it against
production — the converter handles the patterns seen in your exports, but
always worth double-checking row counts match afterward.

### 5. Add frontend env vars
In your `.env` (used by Vite at build time):
```
VITE_API_BASE_URL=/api
VITE_API_KEY=<same value as backend's API_KEY>
```
Add `VITE_API_KEY` in Hostinger's Environment Variables too, so it's baked
into the build.

### 6. Switch Hostinger back to Node/Express hosting
In Deployments → Settings and redeploy:
- Framework preset: **Express**
- Entry file: **server.js**
- Build command: `npm run build` (unchanged — still runs `vite build`)
- The Express server now serves the built `dist/` folder AND the `/api/*`
  backend from the same process, so no separate static-hosting step is
  needed anymore.

Save and redeploy. The build should now succeed — `server.js` exists,
starts an Express app, connects to MySQL, and serves your React app.

## Known trade-offs to know about

- **API_KEY is a shared secret, not per-user auth.** Like the original app
  (which never used Supabase Auth sessions — just a custom credential
  check + `sessionStorage`), this migration keeps the same security model
  for now: anyone with the key can hit any endpoint. If you want real
  per-role restrictions later (desk officer vs ITI officer vs director),
  that needs a proper login-issued token layer added to `routes/rpc.js`'s
  login endpoint and checked per-request. Worth doing before this goes
  fully to production with sensitive data.
- **Digital signatures / uploaded documents** are still stored as base64
  text directly in MySQL (`LONGTEXT`), matching what Supabase was doing.
  This works but bloats the database. Consider switching to saving these
  as actual files (Hostinger File Manager) with just the path stored in
  MySQL, when you have time to revisit it.
- **`emailReminderEngine.ts` and `emailPasswordReset.ts`** now send email
  via your own Gmail SMTP credentials through `routes/functions.js`,
  instead of Supabase's Edge Function. Functionally equivalent, just a
  different backend doing the sending.
