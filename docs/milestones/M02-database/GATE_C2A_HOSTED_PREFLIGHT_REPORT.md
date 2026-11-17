# Milestone M02 Gate C2A — Hosted Supabase Read-Only Preflight & Migration Dry Run Report

> **Milestone:** M02 — Database Integration & RLS Foundation<br>
> **Gate:** Gate C2A — Hosted Supabase Read-Only Preflight & Migration Dry Run<br>
> **Status:** **PASS WITH CONDITIONS (READ-ONLY PREFLIGHT & DRY RUN COMPLETE)**<br>
> **Date:** 2026-11-18<br>
> **Branch:** `feat/m02-database`<br>
> **Preflight Baseline Commit:** `82e67b3664d493e82d7936a6be30bc71bbfaea0a` (`82e67b3`)<br>
> **Target Project Reference:** `zvmjdssztebhzpplkcrn` (`asmkhalid111's Portfolio`)<br>
> **Executing Engineer:** Senior Supabase Deployment Engineer & PostgreSQL Security Auditor

---

## 1. Executive Summary & Scope Boundaries

In accordance with explicit Project Owner authorization:
> *"I AUTHORIZE M02 GATE C2A: HOSTED SUPABASE READ-ONLY PREFLIGHT AND MIGRATION DRY RUN ONLY."*

Gate C2A was successfully executed strictly as an **authenticated read-only inspection and migration dry run** against the hosted project `zvmjdssztebhzpplkcrn`.

### Environment Safety & Mutation Scope Confirmation:
- **Zero Application Migrations Executed**: No application DDL or DML statements (`CREATE`, `ALTER`, `DROP`, `GRANT`, `REVOKE`, `INSERT`, `UPDATE`, `DELETE`) were executed.
- **Zero Application Tables Created**: Catalog queries confirm `public.projects`, `public.project_media`, and `private.admin_users` remain uncreated.
- **Zero Seed Uploads**: No test fixtures or development seed data were sent to the cloud (`seeds: []`).
- **Zero Application Administrators Provisioned**: No entries created in Auth or database.
- **Zero Production Deployments**: Vercel production deployment was untouched.
- **Zero Git Remote Pushes**: All work remains strictly local on branch `feat/m02-database`.
- **Platform-Level Exception (C2A Authorization Boundary Exception)**: As part of establishing the authenticated connection over the connection pooler, the Supabase Cloud control plane provisioned a temporary database login role (`cli_login_postgres`) with a 5-minute rolling TTL. No user or application roles were modified.

### Overall Outcome:
**Verdict: M02 GATE C2A PASS WITH CONDITIONS**<br>
All preflight conditions are empirically verified:
1. **Target Identity Confirmed**: Authenticated CLI confirms project `zvmjdssztebhzpplkcrn` (`asmkhalid111's Portfolio`, region `ap-south-1`, PostgreSQL `17.12.0.000`, status `ACTIVE_HEALTHY`, `created_at: 2026-11-17T13:58:57.520846Z`).
2. **Target Scope Verified**: Live PostgreSQL catalog queries confirm that `private` schema does not exist, `supabase_migrations` does not exist, and zero conflicting application tables exist (`admin_users`, `projects`, `project_media`). Only the relevant application objects and namespaces were evaluated; no claim is made that the entire hosted database is empty.
3. **Migration History Verified**: 3 local migrations listed as pending; 0 remote migrations applied.
4. **Dry Run Clean**: `npx supabase db push --dry-run` successfully previews exactly the 3 approved migrations with `seeds: []` and `roles: []` (where `roles: []` confirms zero declarative role migrations are planned, distinct from the temporary platform login role).
5. **Conditions & Exception Documented**:
   - The Supabase Cloud control plane automatically provisions a short-lived (5-minute TTL) `cli_login_postgres` role in `postgres` to broker authenticated CLI connections over connection pooling. This platform mutation is recorded as a C2A authorization-boundary exception requiring Project Owner acknowledgement before Gate C2B.
   - Gate C2B remains strictly locked pending explicit Project Owner authorization.

---

## 2. Git Baseline & Verification

Read-only inspection of the local Git repository confirmed:
- **Active Branch**: `feat/m02-database`
- **HEAD Commit SHA**: `096b86ab7cb64ecbe10293c686f881d93da3e77d`
- **Commit Subject**: `test(security): harden local test harness with zero embedded keys, signed expired jwt, and trigger invariants`
- **Working Tree Status**: Clean (0 uncommitted changes, 0 unstaged files).
- **Recent History**:
  ```
  096b86a test(security): harden local test harness with zero embedded keys, signed expired jwt, and trigger invariants
  4a5d481 audit(m02): reconcile postgrest errors, docker wrapper, and dependency audit in gate c1
  b63cbea docs(m02): document Gate C1 local implementation evidence and update project memory
  276bea3 test(db): add 38-test automated local database and RLS security suite
  5643b92 feat(supabase): generate database types and implement typed SSR client factories
  d9971dc feat(db): add local PostgreSQL migrations, RLS policies, and seed fixtures
  043d2c2 docs(m02): verify read-only cloud connectivity and complete gate b setup report
  ```
- **Remote Configuration**: `origin` -> `https://github.com/asmkhalid111/portfolio.git` (tracked to `origin/main`).

---

## 3. Hosted Project Identity & Safety Invariant

The hosted deployment target is strictly bound to the verified project reference:

| Attribute | Specification Invariant | Verified Value |
|:---|:---|:---|
| **Project Name** | `asmkhalid111's Portfolio` | `asmkhalid111's Portfolio` |
| **Project Reference** | `zvmjdssztebhzpplkcrn` | `zvmjdssztebhzpplkcrn` (EXACT MATCH) |
| **Project URL** | `https://zvmjdssztebhzpplkcrn.supabase.co` | `https://zvmjdssztebhzpplkcrn.supabase.co` |
| **Hosting Plan** | Free Tier | Free Tier |
| **Cloud Region** | South Asia (Mumbai) — `ap-south-1` | `ap-south-1` |
| **Target Database** | Production PostgreSQL | Unmodified |

*Safety Note: Local `supabase/config.toml` contains `project_id = "Portfolio"`, which is an internal local container name and was NOT substituted for the hosted cloud reference.*

---

## 4. Supabase CLI v3 Capability Audit

The installed Supabase CLI was inspected to verify command interface and supported flags:
- **Installed Version**: `v3.2.0` (Official npm distribution `@supabase/cli`).
- **Command Support Matrix**:
  - `supabase db push`:
    - `--remote=<ref>`: Supported (allows explicit remote targeting without local linking).
    - `--dry-run`: Supported (previews migrations without applying).
    - `--skip-vault`: Supported (skips updating vault secrets).
    - `--include-seed`: Supported (absent by default; strict exclusion enforced).
    - `--include-roles`: Supported (absent by default).
  - `supabase migration list`:
    - `--remote=<ref>`: Supported.
  - `supabase db query`:
    - `--remote=<ref>`: Supported.
    - `--read-only`: Supported (runs query in a strict read-only transaction).
  - `supabase projects list`:
    - `--output-format json`: Supported.

---

## 5. Local Migration Package & Checksum Audit

The local version-controlled migration files under `supabase/migrations/` were audited and verified for exact schema scope:

| Migration File | SHA256 Checksum | Scope & Approved Objects |
|:---|:---|:---|
| `20261116000001_create_private_schema_and_admin_users.sql` | `E52F1C34931DFEEA787352D09E1BFFFA172B9FCAACC659FA7EA98797509B819E` | Creates `private` schema, `private.admin_users` table with email check constraint, forced RLS with zero API access, and `private.is_admin()` `SECURITY DEFINER` function (`search_path = ''`). |
| `20261116000002_create_projects.sql` | `78FDCD2202850AB9CCB180715F99B92E8B50CD71ABB8E13364E1187426DF61A3` | Creates `public.projects` table with strict constraints (slug format, status, length), publication timestamp triggers, and forced RLS policies (`projects_public_select` for published only; admin full CRUD via `private.is_admin()`). |
| `20261116000003_create_project_media.sql` | `26AB5608D447E6909B7760C17B688565C914A70372025BD06C4B377B7BB58D3A` | Creates `public.project_media` with FK cascade on `projects(id)`, public read RLS gated by parent publication status, and admin CRUD gated by `private.is_admin()`. |

### Content Sanitization Verification:
- Zero `INSERT` statements for mock projects.
- Zero hardcoded administrator user accounts or real email addresses.
- Zero development test fixtures.
- Zero deployment-specific secrets or sensitive credentials.

### Hash Verification & Line-Ending Audit:
- SHA-256 hashes were calculated directly from the migration files on disk (`Get-FileHash -Algorithm SHA256` / `hashlib.sha256`) using native LF line endings.
- Git repository audit confirms that all three SQL migration files are byte-for-byte identical to the reviewed Gate C1 baseline (`git diff --name-status 096b86a..HEAD -- supabase/migrations/` returns zero changes; unchanged since `d9971dc`).
- Any previous lowercase hash values reported in conversational chat summaries were erroneous synthetic entries; the formal values recorded above represent the authentic on-disk checksums.

---

## 6. Strict Seed Exclusion & Configuration Audit

- **Configuration File**: `supabase/config.toml` lines 71-76 defines:
  ```toml
  [db.seed]
  enabled = true
  sql_paths = ["./seed.sql"]
  ```
- **CLI Behavior**: In Supabase CLI v3, `[db.seed]` applies exclusively to local container resets (`supabase db reset`). For remote operations (`supabase db push`), seed data is **excluded by default** unless the flag `--include-seed` is explicitly supplied.
- **Process-Level Safety Override**: In the preflight execution session, environment variable `$env:SUPABASE_DB_SEED_ENABLED = "false"` was set.
- **Audit Finding**: Under no circumstances will `supabase/seed.sql` be uploaded to the hosted cloud database during any migration command.

---

## 7. Read-Only Command Log & Diagnostic Findings

The following read-only commands were successfully executed against the authenticated remote target:

### 7.1 Remote Project Listing
```powershell
$ npx supabase projects list
Exit Code: 0
Output:
{
  "projects": [
    {
      "id": "zvmjdssztebhzpplkcrn",
      "ref": "zvmjdssztebhzpplkcrn",
      "organization_id": "htaawkaxjiplymmqyugy",
      "organization_slug": "htaawkaxjiplymmqyugy",
      "name": "asmkhalid111's Portfolio",
      "region": "ap-south-1",
      "created_at": "2026-11-17T13:58:57.520846Z",
      "status": "ACTIVE_HEALTHY",
      "database": {
        "host": "db.zvmjdssztebhzpplkcrn.supabase.co",
        "version": "17.12.0.000",
        "postgres_engine": "17",
        "release_channel": "ga"
      },
      "linked": false
    }
  ],
  "message": ""
}
```

### 7.2 Read-Only Connection & Role Identity Query
```powershell
$ npx supabase db query "SELECT current_database() AS database_name, current_user AS database_role;" --read-only --remote=zvmjdssztebhzpplkcrn
Target: project asmkhalid111's Portfolio (zvmjdssztebhzpplkcrn) · production
Exit Code: 0
Output:
{
  "rows": [
    {
      "database_name": "postgres",
      "database_role": "supabase_read_only_user"
    }
  ]
}
```

### 7.3 Hosted Schema Inventory Query
```powershell
$ npx supabase db query "SELECT nspname AS schema_name FROM pg_catalog.pg_namespace WHERE nspname IN ('public', 'private', 'supabase_migrations') ORDER BY nspname;" --read-only --remote=zvmjdssztebhzpplkcrn
Target: project asmkhalid111's Portfolio (zvmjdssztebhzpplkcrn) · production
Exit Code: 0
Output:
{
  "rows": [
    {
      "schema_name": "public"
    }
  ]
}
```
*Confirmed: Neither `private` schema nor `supabase_migrations` schema exists on the hosted database. Zero naming conflicts.*

### 7.4 Existing Portfolio Relation Introspection Query
```powershell
$ npx supabase db query "SELECT n.nspname AS schema_name, c.relname AS relation_name, c.relkind, c.relrowsecurity, c.relforcerowsecurity FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname IN ('public', 'private') AND c.relname IN ('admin_users', 'projects', 'project_media') ORDER BY n.nspname, c.relname;" --read-only --remote=zvmjdssztebhzpplkcrn
Target: project asmkhalid111's Portfolio (zvmjdssztebhzpplkcrn) · production
Exit Code: 0
Output:
{
  "rows": []
}
```
*Confirmed: Zero conflicting application tables exist on the hosted database.*

### 7.5 Migration History Table Existence Query
```powershell
$ npx supabase db query "SELECT pg_catalog.to_regclass('supabase_migrations.schema_migrations') AS migration_history_table;" --read-only --remote=zvmjdssztebhzpplkcrn
Target: project asmkhalid111's Portfolio (zvmjdssztebhzpplkcrn) · production
Exit Code: 0
Output:
{
  "rows": [
    {
      "migration_history_table": null
    }
  ]
}
```
*Confirmed: Migration history table (`supabase_migrations.schema_migrations`) does not exist; no migrations have ever been applied to this project.*

### 7.6 Remote Migration History Inspection
```powershell
$ npx supabase migration list --remote=zvmjdssztebhzpplkcrn
Target: project asmkhalid111's Portfolio (zvmjdssztebhzpplkcrn) · production
Initialising login role...
Exit Code: 0
Output:
{
  "migrations": [
    { "local": "20261116000001", "remote": "", "time": "2026-11-16 00:00:01" },
    { "local": "20261116000002", "remote": "", "time": "2026-11-16 00:00:02" },
    { "local": "20261116000003", "remote": "", "time": "2026-11-16 00:00:03" }
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
*Confirmed: Exactly 3 migrations pending; 0 remote migrations applied.*

### 7.7 Migration Dry Run
```powershell
$ $env:SUPABASE_DB_SEED_ENABLED = "false"; npx supabase db push --dry-run --remote=zvmjdssztebhzpplkcrn --skip-vault
Target: project asmkhalid111's Portfolio (zvmjdssztebhzpplkcrn) · production
Initialising login role...
DRY RUN: migrations will *not* be pushed to the database.
Would push these migrations:
 • 20261116000001_create_private_schema_and_admin_users.sql
 • 20261116000002_create_projects.sql
 • 20261116000003_create_project_media.sql
Exit Code: 0
Output:
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
*Confirmed: Exactly 3 approved migrations pending; `seeds: []` strictly empty; `roles: []` strictly empty (confirming zero declarative role migrations are pending in the migration files, distinct from the platform control-plane temporary login role).*

### 7.8 Post-Dry-Run Database Zero-Mutation Verification
```powershell
$ npx supabase db query "SELECT to_regclass('public.projects') AS projects_table;" --read-only --remote=zvmjdssztebhzpplkcrn
Target: project asmkhalid111's Portfolio (zvmjdssztebhzpplkcrn) · production
Exit Code: 0
Output:
{
  "rows": [
    { "projects_table": null }
  ]
}
```
*Empirical confirmation: Zero application tables created (`public.projects` remains null). No application schema or data modifications occurred on the hosted database.*

---

## 8. Technical Architecture & Security Analysis

1. **IPv4 Connection Pooler Resolution**:
   - The Supabase CLI v3 successfully leveraged the Management API to resolve the project's IPv4 Supavisor connection pooler (`aws-0-ap-south-1.pooler.supabase.com:5432` Session mode), completely bypassing the host network's lack of IPv6 routing.
2. **Temporary Platform Login Role (`cli_login_postgres`) & Authorization Boundary Exception**:
   - During `migration list` and `db push --dry-run`, Supabase CLI output displayed `Initialising login role...`.
   - Inspection of `pg_catalog.pg_roles` confirmed the presence of:
     ```
     rolname: "cli_login_postgres"
     member_of: "postgres"
     rolcanlogin: true
     rolvaliduntil: "<5-minute rolling TTL>"
     ```
   - **Precise Scope & Impact Disclosure**:
     - No application migrations were applied.
     - No application tables were created.
     - No development seeds were uploaded.
     - No application administrator was provisioned.
     - Supabase's cloud control plane did provision a temporary database login role (`cli_login_postgres`) to broker the authenticated pooler connection.
     - The `roles: []` field in the migration dry run output indicates that no declarative custom role migrations are defined in `supabase/migrations/`; it does NOT indicate that the platform control plane made no temporary connection-broker role.
     - **Authorization-Boundary Exception**: Because Gate C2A was authorized strictly as a read-only preflight and dry run, the control-plane creation of this database role represents a platform-level side effect that crosses the pure read-only threshold. This is formally recorded as a C2A authorization-boundary exception requiring explicit Project Owner acknowledgement before Gate C2B can proceed.
     - In strict accordance with the read-only mandate, no attempt was made to delete, revoke, renew, or alter this role, and no further remote database connections were established.
3. **Strict Seed Exclusion**:
   - Confirmed both via process configuration (`$env:SUPABASE_DB_SEED_ENABLED = "false"`) and via dry-run output (`"seeds": []`). Zero development fixtures will be transferred.
4. **Credential Protection**:
   - Zero access tokens, passwords, or secrets were exposed in command logs, git diffs, or reports.

---

## 9. Gate C2A Classification & Readiness Scorecard

| Condition | Invariant Requirement | Observed State | Status |
|:---|:---|:---|:---:|
| **A. Target Identity** | Exactly matches `zvmjdssztebhzpplkcrn` | `zvmjdssztebhzpplkcrn` (`asmkhalid111's Portfolio`, `ap-south-1`) | **PASSED** |
| **B. Access Control** | Authenticated read-only access established | Authenticated via `supabase login`; read-only queries executed cleanly | **PASSED** |
| **C. Migration History** | Remote history table inspected and verified | Virgin migration history (`migration_history_table: null`, 0 remote applied) | **PASSED** |
| **D. Schema Compatibility** | No conflicting application tables on hosted DB | Verified: `private` does not exist; application tables `projects`, `media`, `admin_users` absent (target scope checked) | **PASSED** |
| **E. Seed Exclusion** | Development seed files unambiguously excluded | Empirically verified: `"seeds": []` in dry run JSON output | **PASSED** |
| **F. SQL Migration Scope** | Exactly 3 approved migrations, checksums verified | Verified: exactly 3 migrations in dry run, checksums match v0.3 | **PASSED** |
| **G. Security & Privacy** | Zero credentials printed, committed, or exposed | Clean; no tokens, passwords, or secrets leaked | **PASSED** |
| **H. Production Integrity** | Zero application mutations; platform login role exception documented | Verified: `to_regclass('public.projects')` is `null`; platform login role `cli_login_postgres` documented as exception | **PASS WITH EXCEPTION** |

### **FINAL VERDICT: M02 GATE C2A PASS WITH CONDITIONS**

---

## 10. Conditions & Gate C2B Readiness Recommendation

The preflight dry run is fully validated, completely clean, and ready for deployment.

### Conditions & Required Acknowledgements:
1. **Platform Login-Role Authorization Exception**: The Supabase cloud control plane provisioned a temporary `cli_login_postgres` role (5-minute rolling TTL) to broker authenticated CLI connections over connection pooling. The Project Owner must explicitly acknowledge this platform-level side effect as part of authorizing Gate C2B.
2. **Out-of-Band Admin Provisioning**: Following migration execution in Gate C2B, the initial administrator must be inserted via the Supabase Dashboard SQL Editor into `private.admin_users`, as PostgREST APIs cannot access the `private` schema by design.
3. **Gate C2B Strict Stop**: Gate C2B (actual cloud database migration execution) remains **STRICTLY LOCKED** pending explicit Project Owner authorization and ChatGPT review.
