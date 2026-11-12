# GeoPulse Attendance API

This is a separate Express/TypeScript API. It uses the existing Prisma schema at `../prisma/schema.prisma`; it does not create a database or run migrations.

## Setup

From this directory:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` with server-only PostgreSQL connection strings and the Supabase project URL/anon key. Keep `.env` out of source control. Never put database connection strings or a Supabase service-role key in frontend `VITE_*` variables.

Generate the Prisma client and validate the schema without changing the database:

```powershell
npm run prisma:generate
npx prisma validate --schema ../prisma/schema.prisma
```

Selfie attendance requires the additive SQL migration at `../prisma/migrations/20261111_add_attendance_photos/migration.sql`. Review it against the live policies, then apply it through the database administrator's normal migration process before deploying the client/API changes. The migration adds nullable evidence fields to the existing attendance table, creates a private JPEG-only Storage bucket, and adds admin-only attendance/photo read policies plus employee-owned upload/read policies. It does not modify existing policies or automatically change the database. Verify that `employees.role` uses the `admin` value and employees can read their own employee row before applying it.

Do not use the Supabase `postgres` owner/superuser as the runtime `DATABASE_URL` account. Protected reads and writes use an explicit transaction, `SET LOCAL ROLE authenticated`, and transaction-local Supabase JWT claims derived only from the verified bearer token. The runtime login role must be a dedicated non-superuser with `NOBYPASSRLS` and membership in `authenticated` so it can set that role; `NOINHERIT` prevents automatic inheritance of those privileges. The credential is still powerful because its holder can explicitly `SET ROLE authenticated` and set claims, so store it only in the API secret manager and restrict network access. It needs no employee `UPDATE` grant: an advisory transaction lock serializes attendance sequence changes.

Before production, inspect the actual project's role attributes, membership, table grants, and `pg_policies`. Confirm `authenticated` is not `BYPASSRLS`, `auth.uid()` returns the verified user inside the transaction, employee/attendance policies are scoped to that identity, and office read policy permits the intended active-office lookup. The Prisma schema only marks some models as having RLS; it does not contain the live RLS policies. Do not disable RLS or grant database-owner privileges to make a failing policy work. If you decide the API must bypass RLS instead, that requires an explicit security review and a separate restricted service role; this implementation does not use a service-role key or bypass role.

The following are read-only inspection queries for an administrator to run against a staging project before changing privileges:

```sql
SELECT rolname, rolsuper, rolinherit, rolbypassrls
FROM pg_roles
WHERE rolname IN ('geopulse_api', 'authenticated', 'anon');

SELECT parent.rolname AS granted_role, member.rolname AS member_role
FROM pg_auth_members membership
JOIN pg_roles parent ON parent.oid = membership.roleid
JOIN pg_roles member ON member.oid = membership.member
WHERE parent.rolname = 'authenticated' AND member.rolname = 'geopulse_api';

SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
	AND table_name IN ('employees', 'offices', 'attendance')
	AND grantee IN ('authenticated', 'geopulse_api')
ORDER BY table_name, grantee, privilege_type;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
	AND tablename IN ('employees', 'offices', 'attendance');

SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
	AND relname IN ('employees', 'offices', 'attendance');
```

After a DBA confirms the role membership and grants on **staging**, verify identity context in a rollback-only read transaction using a test user's UUID:

```sql
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"<staging-user-uuid>","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '<staging-user-uuid>', true);
SELECT session_user, current_user, auth.uid(), auth.role();
ROLLBACK;
```

The expected `current_user`/`auth.role()` are `authenticated`, and `auth.uid()` must equal only the staging user's UUID. Then run policy-scoped `SELECT` checks for that test employee, active offices, and attendance. This check does not prove that every production policy is correct; inspect each returned policy definition before deployment.

The proposed role setup below is **not executed by this project** and must be reviewed/applied by a database administrator in staging first. Set the password through a secure console/secret manager, never in source control:

```sql
CREATE ROLE geopulse_api LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
	NOREPLICATION NOBYPASSRLS;
GRANT authenticated TO geopulse_api;
```

Review `CONNECT` and existing grants before adding any more. Membership only permits the API login to `SET ROLE authenticated`; the effective row access must still be restricted by the existing policies. The API maps the Supabase user UUID to `public.employees.id`, checks active employee/office and business rules, and scopes history queries to that employee.

## Commands

```powershell
npm run dev
npm run typecheck
npm test
npm run build
npm start
```

The frontend origins allowed by CORS are configured in `FRONTEND_ORIGIN` as a comma-separated list (for example, the exact `https://<site>.netlify.app` origin in production). The API must itself be hosted with HTTPS in production. Configure `TRUST_PROXY_HOPS` to the exact number of trusted proxies used by your hosting provider (leave at 0 when directly exposed); do not set Express `trust proxy` to `true` indiscriminately. PostgreSQL URL examples require TLS with `sslmode=require`. Exactly one active `offices` row is required for `GET /api/work-locations/active`; zero returns 404 and multiple active offices return 409 instead of choosing an arbitrary office. `MAX_GPS_ACCURACY_METERS` defaults to 20. Official attendance time/date are derived from backend server time in `ATTENDANCE_TIME_ZONE` (defaults to `Asia/Jakarta`). `ATTENDANCE_PHOTO_BUCKET` must be exactly `attendance-photos`; the bucket must be private and limited to 5 MB JPEG files as configured by the migration. The existing Supabase URL and anon key are used with each verified employee token; no service-role key or public photo URL is used.

## Endpoints

- `GET /api/health`: public health response.
- `GET /api/work-locations/active`: authenticated active office and accuracy threshold.
- `POST /api/attendance/check-in`: authenticated, server-validated check-in.
- `POST /api/attendance/check-out`: authenticated, server-validated check-out after a same-day check-in.
- `GET /api/attendance/history`: authenticated attendance history for the caller only.
- `GET /api/admin/attendance-photos`: admin-only attendance photo evidence with five-minute signed URLs.

Attendance writes run in an authenticated transaction that sets the verified Supabase identity for RLS and acquires a PostgreSQL transaction advisory lock keyed by the authenticated user before checking sequence/duplicates. The existing unique constraint on employee/date/type remains the final duplicate guard. The API uses no client-supplied employee ID, distance, or geofence result. A selfie must be present and successfully uploaded before the attendance row is created; `photo_captured_at` is generated by the server when accepting the uploaded photo. The in-memory concurrency unit test checks application behavior only; staging PostgreSQL integration is still required to verify real advisory locks, RLS policies, private Storage access, and constraints.

## Deployment

Deploy `backend/` to a Node.js host (Render, Railway, Fly.io, or an equivalent provider). Use Node 20.19+ or 22+ and configure:

- Build command: `npm ci && npm run build && npm prune --omit=dev --omit=optional`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment variables from `.env.example` in the host's secret/configuration UI.

The build runs `prisma generate` from the shared schema; it does not connect to the database or run migrations. Generate during the build stage, then prune dev tools and optional peer dependencies for runtime. This removes the Prisma CLI/config dependency chain from the deployed runtime install; it does not resolve the development lockfile advisory reported by plain `npm audit` or `npm audit --omit=dev`. Keep the generated `backend/generated/prisma` directory available to the built server artifact. Configure the API's TLS/HTTPS on the hosting provider. Set `FRONTEND_ORIGIN` to the exact production web origin, not `*`. In the frontend hosting environment (for example Netlify), set `VITE_ATTENDANCE_API_URL` to the HTTPS API origin and rebuild the frontend.

## Staging Integration Test

No production Supabase credentials are needed for unit tests. For a real integration test, use an isolated **staging Supabase project**, a dedicated active test employee whose UUID matches a Supabase Auth user, and exactly one active test office. Do not test by inserting attendance for a real employee or by deleting attendance rows afterward. Ensure existing RLS policies allow the `authenticated` identity to read its employee, read the configured office, and insert/read only its own attendance. Verify role attributes/membership/policies with the read-only queries above before starting the API.

Configure staging variables in `backend/.env` locally or in the API host's secret manager, then run `npm run prisma:generate`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run dev`. Obtain a short-lived access token for the dedicated staging test account locally; do not paste it into chat or commit it. In PowerShell, call `GET /api/work-locations/active` with that bearer token, then use the office coordinates returned by the API and a real device location inside that test geofence for `POST /api/attendance/check-in` and `POST /api/attendance/check-out`. Verify both responses contain `verified`, `is_within_geofence: true`, and the same `office_id` as the requested test office. These two calls create staging attendance records and are intentionally not automatically cleaned up.