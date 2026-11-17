# Milestone M02 Gate C2B — Controlled Hosted Supabase Migration Report

> **Milestone:** M02 — Database Integration & RLS Foundation<br>
> **Gate:** Gate C2B — Controlled Hosted Supabase Migration Execution & Security Verification<br>
> **Status:** **PASS WITH CONDITIONS (MIGRATION & VERIFICATION COMPLETE; ADMIN PROVISIONING PENDING)**<br>
> **Date:** 2026-11-18<br>
> **Branch:** `feat/m02-database`<br>
> **Pre-Deployment Baseline Commit:** `1d3b4b282d061ea019e964e53d388736651d2e2d` (`1d3b4b2`)<br>
> **Target Project Reference:** `zvmjdssztebhzpplkcrn` (`asmkhalid111's Portfolio`)<br>
> **Target Region:** `ap-south-1` (Mumbai, South Asia)<br>
> **Executing Roles:** Project Owner (Manual Execution Safeguard), Senior PostgreSQL Engineer & Security Auditor (Verification)

---

## 1. Executive Summary & Authorization Boundary

In accordance with explicit Project Owner authorization:
> *"I acknowledge that Supabase CLI may create the temporary platform-managed cli_login_postgres role. I AUTHORIZE M02 GATE C2B: HOSTED SUPABASE DATABASE MIGRATION EXECUTION for the three approved migrations only, targeting zvmjdssztebhzpplkcrn."*

Gate C2B was executed using the mandatory **human-in-the-loop execution safeguard**:
1. All pre-deployment environment, checksum, schema, and dry-run checks were verified by the engineer.
2. The Project Owner manually executed the approved migration command in an external interactive Windows PowerShell terminal, personally verifying the prompt and confirming execution without automated confirmation bypass flags (`--yes`).
3. Post-migration read-only verification was executed to inspect migration history, database catalogs, RLS policies, triggers, functions, seed exclusion, and public Data API endpoints.

### Absolute Environment Safety & Boundary Confirmation:
- **Zero Additional Migrations Executed**: Exactly the 3 approved migrations were applied in order.
- **Zero Application Administrators Provisioned**: `private.admin_users` remains completely empty (`count: 0`).
- **Zero Hosted Auth Users Created**: Supabase Auth accounts remain unprovisioned.
- **Zero Development Seeds Uploaded**: `supabase/seed.sql` was completely excluded; `projects` and `project_media` contain 0 rows.
- **Zero Storage Changes**: No buckets created, no files uploaded.
- **Zero Production Deployments**: Vercel production deployment was untouched.
- **Zero Git Remote Pushes**: All commits remain strictly local on `feat/m02-database`.

---

## 2. Git Baseline & Verification

Read-only inspection of the local Git repository confirmed:
- **Active Branch**: `feat/m02-database`
- **Pre-Deployment HEAD SHA**: `1d3b4b282d061ea019e964e53d388736651d2e2d` (`1d3b4b2`)
- **Commit Subject**: `docs(m02): reconcile c2a checksums and hosted login-role disclosure`
- **Working Tree Status**: Clean (0 uncommitted changes, 0 unstaged files).
- **Migration Immutability**:
  ```powershell
  $ git diff --name-status 096b86a..HEAD -- supabase/migrations/
  # (Clean exit code 0; zero output)
  ```
  Confirmed that all migration SQL files are byte-for-byte identical to the reviewed Gate C1 security baseline.

---

## 3. Target Identity & Cloud Configuration

The migration was strictly bound to the verified production target:

| Attribute | Specification Invariant | Observed / Verified Value | Status |
|:---|:---|:---|:---:|
| **Project Name** | `asmkhalid111's Portfolio` | `asmkhalid111's Portfolio` | **MATCH** |
| **Project Reference** | `zvmjdssztebhzpplkcrn` | `zvmjdssztebhzpplkcrn` | **MATCH** |
| **Project URL** | `https://zvmjdssztebhzpplkcrn.supabase.co` | `https://zvmjdssztebhzpplkcrn.supabase.co` | **MATCH** |
| **Hosting Plan** | Free Tier | Free Tier | **MATCH** |
| **Cloud Region** | South Asia (Mumbai) — `ap-south-1` | `ap-south-1` | **MATCH** |
| **Database Engine** | PostgreSQL 17 | `17.12.0.000` | **MATCH** |
| **Environment** | Production | Production | **MATCH** |
| **CLI Target Mode** | Explicit `--remote=zvmjdssztebhzpplkcrn` | Explicitly passed in all commands | **MATCH** |

---

## 4. Migration Package & On-Disk Checksums

Byte-for-byte SHA-256 verification against local files on disk (native LF line endings) prior to deployment:

| Migration File | SHA-256 Checksum | Approved Scope |
|:---|:---|:---|
| `20261116000001_create_private_schema_and_admin_users.sql` | `E52F1C34931DFEEA787352D09E1BFFFA172B9FCAACC659FA7EA98797509B819E` | Creates `private` schema, `private.admin_users` table with email regex check, forced RLS, and `private.is_admin()` `SECURITY DEFINER` function (`search_path = ''`). |
| `20261116000002_create_projects.sql` | `78FDCD2202850AB9CCB180715F99B92E8B50CD71ABB8E13364E1187426DF61A3` | Creates `public.projects` table with strict constraints (slug format, status, lengths, URLs), publication timestamp triggers, and 5 forced RLS policies. |
| `20261116000003_create_project_media.sql` | `26AB5608D447E6909B7760C17B688565C914A70372025BD06C4B377B7BB58D3A` | Creates `public.project_media` with FK cascade on `projects(id)`, parent-publication read RLS, and 5 forced RLS policies. |

---

## 5. Pre-Deployment State & Recovery Assessment

Prior to executing the live migration, read-only queries refreshed the cloud baseline:
- **Hosted Schemas**: Only `public` existed (`private` and `supabase_migrations` were absent).
- **Application Relations**: 0 conflicting relations (`admin_users`, `projects`, `project_media` returned 0 rows).
- **Remote Migration History**: 0 remote migrations applied.
- **Recovery Readiness**:
  - Supabase Free Tier does not provide automated Point-in-Time Recovery (PITR) or daily scheduled backups.
  - Because the database was in a verified virgin state with zero pre-existing application data, zero customer or application data was at risk.
  - Any unexpected migration failure was governed by the rule to halt immediately and diagnose rather than attempting destructive resets.

---

## 6. Final Pre-Deployment Dry Run

Immediately before hand-off to the Project Owner, the final dry run was executed:

```powershell
$ $env:SUPABASE_DB_SEED_ENABLED = "false"; npx supabase db push --dry-run --remote=zvmjdssztebhzpplkcrn --skip-vault
```
```json
{
  "upToDate": false,
  "dryRun": true,
  "migrations": [
    "20261116000001_create_private_schema_and_admin_users.sql",
    "20261116000002_create_projects.sql",
    "20261116000003_create_project_media.sql"
  ],
  "seeds": [],
  "roles": [],
  "message": "Finished supabase db push.",
  "target": {
    "kind": "linked",
    "project_ref": "zvmjdssztebhzpplkcrn",
    "project_name": "asmkhalid111's Portfolio",
    "environment": "production"
  }
}
```
*Dry Run Verification: Exit code 0, exactly 3 migrations in order, `seeds: []`, `roles: []`.*

---

## 7. Owner-Executed Production Deployment

In accordance with Section 10 human execution safeguards:
- **Executing User**: Project Owner (interactive terminal outside agent).
- **Working Directory**: `E:\Codes\Portfolio`
- **Environment**: `$env:SUPABASE_DB_SEED_ENABLED = "false"`, `SUPABASE_YES` unset.
- **Exact Command Executed**:
  ```powershell
  npx supabase db push --remote=zvmjdssztebhzpplkcrn --skip-vault
  ```
- **Interactive Review & Confirmation**: The Project Owner reviewed the target (`asmkhalid111's Portfolio (zvmjdssztebhzpplkcrn) · production`) and the 3 approved migrations, and confirmed interactively with `y`.
- **Exit Code**: `0` (`$LASTEXITCODE` returned `0`).
- **Execution Message**: `"Finished supabase db push."`

---

## 8. Post-Deployment Verification Findings

### 8.1 Remote Migration History Verification
```powershell
$ npx supabase migration list --remote=zvmjdssztebhzpplkcrn
```
```json
{
  "migrations": [
    { "local": "20261116000001", "remote": "20261116000001", "time": "2026-11-16 00:00:01" },
    { "local": "20261116000002", "remote": "20261116000002", "time": "2026-11-16 00:00:02" },
    { "local": "20261116000003", "remote": "20261116000003", "time": "2026-11-16 00:00:03" }
  ],
  "message": "Migrations listed",
  "target": {
    "kind": "linked",
    "project_ref": "zvmjdssztebhzpplkcrn",
    "project_name": "asmkhalid111's Portfolio",
    "environment": "production"
  }
}
```
*Result: Exit code 0. Exactly all 3 migrations are registered remotely. 0 pending migrations.*

---

### 8.2 Database Tables & RLS Status
Catalog query against `pg_catalog.pg_class` and `pg_catalog.pg_namespace`:
```sql
SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity, c.relforcerowsecurity 
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace 
WHERE (n.nspname = 'private' AND c.relname = 'admin_users') 
   OR (n.nspname = 'public' AND c.relname IN ('projects', 'project_media')) 
ORDER BY n.nspname, c.relname;
```
| Schema | Table Name | RLS Enabled (`relrowsecurity`) | Force RLS (`relforcerowsecurity`) | Status |
|:---|:---|:---:|:---:|:---:|
| `private` | `admin_users` | `true` | `true` | **VERIFIED** |
| `public` | `projects` | `true` | `true` | **VERIFIED** |
| `public` | `project_media` | `true` | `true` | **VERIFIED** |

---

### 8.3 Strict Seed Exclusion & Row Count Verification
Querying live row counts across all three tables:
```sql
SELECT 
  (SELECT count(*) FROM private.admin_users) AS admin_users_count, 
  (SELECT count(*) FROM public.projects) AS projects_count, 
  (SELECT count(*) FROM public.project_media) AS project_media_count;
```
| Table | Row Count | Invariant Requirement | Status |
|:---|:---:|:---|:---:|
| `private.admin_users` | **0** | No admin accounts provisioned during migration | **VERIFIED** |
| `public.projects` | **0** | Zero seed projects uploaded from `seed.sql` | **VERIFIED** |
| `public.project_media` | **0** | Zero test media uploaded from `seed.sql` | **VERIFIED** |

---

### 8.4 Constraints & Foreign Key Cascade Audit
Inspecting `pg_catalog.pg_constraint`:
- **`private.admin_users`**:
  - `admin_users_pkey`: `PRIMARY KEY (id)`
  - `admin_users_email_key`: `UNIQUE (email)`
  - `admin_users_id_fkey`: `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`
  - `chk_admin_users_email_valid`: `CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')`
- **`public.projects`**:
  - `projects_pkey`: `PRIMARY KEY (id)`
  - `uq_projects_slug`: `UNIQUE (slug)`
  - `projects_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL`
  - `chk_projects_status`: `CHECK (status = ANY (ARRAY['draft'::text, 'published'::text]))`
  - `chk_projects_slug_format`: `CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(slug) <= 100)`
  - `chk_projects_title_length`: `CHECK (char_length(TRIM(BOTH FROM title)) >= 2 AND char_length(title) <= 200)`
  - `chk_projects_summary_length`: `CHECK (char_length(TRIM(BOTH FROM summary)) >= 10 AND char_length(summary) <= 600)`
  - `chk_projects_sort_order`: `CHECK (sort_order >= 0)`
  - `chk_projects_demo_url`: `CHECK (live_demo_url IS NULL OR live_demo_url ~* '^https?://')`
  - `chk_projects_repo_url`: `CHECK (repository_url IS NULL OR repository_url ~* '^https?://')`
  - `chk_projects_technologies_dims`: `CHECK (array_ndims(technologies) IS NULL OR array_ndims(technologies) = 1)`
- **`public.project_media`**:
  - `project_media_pkey`: `PRIMARY KEY (id)`
  - `project_media_project_id_fkey`: `FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`
  - `chk_project_media_sort_order`: `CHECK (sort_order >= 0)`
  - `chk_project_media_alt_text`: `CHECK (char_length(TRIM(BOTH FROM alt_text)) >= 3 AND char_length(alt_text) <= 300)`
  - `chk_project_media_path`: `CHECK (char_length(TRIM(BOTH FROM storage_path)) >= 3 AND char_length(storage_path) <= 500)`

---

### 8.5 Row Level Security (RLS) Policy Verification
Querying `pg_catalog.pg_policies` across schemas `public` and `private`:

| Table | Policy Name | Command | Targeted Roles | Qual / Using Expression | With Check Expression |
|:---|:---|:---:|:---:|:---|:---|
| `public.projects` | `projects_public_select` | `SELECT` | `{anon, authenticated}` | `(status = 'published'::text)` | *none* |
| `public.projects` | `projects_admin_select` | `SELECT` | `{authenticated}` | `private.is_admin()` | *none* |
| `public.projects` | `projects_admin_insert` | `INSERT` | `{authenticated}` | *none* | `private.is_admin()` |
| `public.projects` | `projects_admin_update` | `UPDATE` | `{authenticated}` | `private.is_admin()` | `private.is_admin()` |
| `public.projects` | `projects_admin_delete` | `DELETE` | `{authenticated}` | `private.is_admin()` | *none* |
| `public.project_media` | `project_media_public_select` | `SELECT` | `{anon, authenticated}` | `(EXISTS (SELECT 1 FROM projects p WHERE p.id = project_media.project_id AND p.status = 'published'::text))` | *none* |
| `public.project_media` | `project_media_admin_select` | `SELECT` | `{authenticated}` | `private.is_admin()` | *none* |
| `public.project_media` | `project_media_admin_insert` | `INSERT` | `{authenticated}` | *none* | `private.is_admin()` |
| `public.project_media` | `project_media_admin_update` | `UPDATE` | `{authenticated}` | `private.is_admin()` | `private.is_admin()` |
| `public.project_media` | `project_media_admin_delete` | `DELETE` | `{authenticated}` | `private.is_admin()` | *none* |
| `private.admin_users` | *(none)* | — | — | *Zero policies; default-deny RLS active* | — |

*Policy Audit Summary:* Exactly 5 policies on `projects`, exactly 5 policies on `project_media`, and 0 policies on `admin_users`. Public access strictly requires `status = 'published'` (directly on `projects` and via parent existence on `project_media`). All admin operations strictly invoke `private.is_admin()`.

---

### 8.6 Table Privileges vs RLS Privilege Separation
Inspecting `has_table_privilege`:
- **`private.admin_users`**:
  - `anon`: `SELECT: false`, `INSERT: false`, `UPDATE: false`, `DELETE: false`
  - `authenticated`: `SELECT: false`, `INSERT: false`, `UPDATE: false`, `DELETE: false`
  *Confirmed: Normal API roles possess ZERO table-level privileges on `private.admin_users`.*
- **`public.projects`**:
  - `anon`: `SELECT: true`, `INSERT: false`, `UPDATE: false`, `DELETE: false` (gated by RLS published policy)
  - `authenticated`: `SELECT: true`, `INSERT: true`, `UPDATE: true`, `DELETE: true` (mutations strictly gated by RLS `private.is_admin()`)
- **`public.project_media`**:
  - `anon`: `SELECT: true`, `INSERT: false`, `UPDATE: false`, `DELETE: false` (gated by RLS parent published policy)
  - `authenticated`: `SELECT: true`, `INSERT: true`, `UPDATE: true`, `DELETE: true` (mutations strictly gated by RLS `private.is_admin()`)

---

### 8.7 Functions, Triggers & Hardened Search Paths
Querying `pg_catalog.pg_proc`:
- **`private.is_admin()`**:
  - `is_security_definer`: `true`
  - `owner`: `postgres`
  - `runtime_config`: `["search_path=\"\""]` (hardened search_path)
  - `anon_can_execute`: `false` (REVOKED from public/anon)
  - `authenticated_can_execute`: `true` (GRANTED to authenticated for RLS evaluation)
- **`public.sync_project_published_at()`**:
  - `owner`: `postgres`
  - `runtime_config`: `["search_path=\"\""]`
  - `anon_can_execute`: `false`
  - `authenticated_can_execute`: `true`
- **`public.update_updated_at_column()`**:
  - `owner`: `postgres`
  - `runtime_config`: `["search_path=\"\""]`
  - `anon_can_execute`: `false`
  - `authenticated_can_execute`: `true`

Querying `pg_catalog.pg_trigger`:
- `trg_projects_published_at`: `BEFORE INSERT OR UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION sync_project_published_at()` (Enabled)
- `trg_projects_updated_at`: `BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()` (Enabled)

---

### 8.8 Read-Only Data API Verification (PostgREST Endpoints)
Direct HTTPS REST queries against the live cloud instance using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:

| Endpoint | HTTP Status | Response Payload | Assessment |
|:---|:---:|:---|:---|
| `GET /rest/v1/projects?select=*` | `200 OK` | `[]` (Array length: 0) | Public read accessible; zero projects leaked; draft isolation active |
| `GET /rest/v1/project_media?select=*` | `200 OK` | `[]` (Array length: 0) | Public read accessible; zero media leaked |
| `GET /rest/v1/admin_users?select=*` | `404 Not Found` | `{"code":"PGRST205","message":"Could not find the table 'public.admin_users' in the schema cache"}` | Private schema completely unexposed to PostgREST |

---

## 9. Gate C2B Compliance & Verification Scorecard

| Invariant / Check | Requirement | Observed Verification | Result |
|:---|:---|:---|:---:|
| **A. Deployment Execution** | Manual owner execution; no `--yes` bypass | Owner executed interactively; exit code `0` | **PASS** |
| **B. Migration History** | Exactly 3 versions applied remotely | All 3 registered (`20261116000001-3`); 0 pending | **PASS** |
| **C. Schema Creation** | `private.admin_users`, `projects`, `project_media` | All 3 tables created with approved constraints/types | **PASS** |
| **D. Foreign Key Cascade** | `project_media(project_id) -> projects(id)` | Foreign key verified with `ON DELETE CASCADE` | **PASS** |
| **E. Row Level Security** | RLS enabled and forced on all tables | `relrowsecurity: true`, `relforcerowsecurity: true` | **PASS** |
| **F. Policy Specification** | 5 policies on projects, 5 on media, 0 on admin | Exactly 10 policies match accepted v0.3 specifications | **PASS** |
| **G. Security Definer** | `private.is_admin()` with fixed search_path | `SECURITY DEFINER`, `search_path = ''`, owner `postgres` | **PASS** |
| **H. Privilege Hardening** | `admin_users` inaccessible to anon/authenticated | `has_table_privilege` returns `false` across all operations | **PASS** |
| **I. Seed Exclusion** | Zero mock/seed data in production tables | `count = 0` on all tables; Data API returns `[]` | **PASS** |
| **J. PostgREST Exposure** | `private` schema completely unexposed | PostgREST returns HTTP 404 (`PGRST205`) for `admin_users` | **PASS** |
| **K. Change Containment** | Zero admin accounts, Auth users, or Vercel changes | Clean boundary; no unauthorized mutations performed | **PASS** |

### **FINAL VERDICT: M02 GATE C2B PASS WITH CONDITIONS**

---

## 10. Conditions & Remaining Risks

### Documented Conditions:
1. **Out-of-Band Admin Provisioning Required**:
   - The database infrastructure is completely provisioned, but `private.admin_users` has 0 rows.
   - The Project Owner must provision the initial administrator account out-of-band via the Supabase Dashboard SQL Editor under separate authorization.
2. **Production Free-Tier Recovery Constraints**:
   - Supabase Free Tier does not include automated point-in-time recovery. Any future schema changes must follow the established preflight dry-run discipline.
3. **Branch Hygiene**:
   - Commits on `feat/m02-database` contain development-phase security hardening and documentation history. A clean squash/rebase is recommended before merging to `main`.
4. **Development Tooling Advisories**:
   - 17 dev-tooling npm advisories (`minimatch`/`picomatch`) remain documented in `docs/ERRORS.md` with zero runtime production impact (`npm audit --omit=dev` remains 0 vulnerabilities).
5. **Storage Bucket Provisioning**:
   - Media storage bucket configuration and storage RLS policies remain deferred to a later milestone as planned.
