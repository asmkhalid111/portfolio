# Milestone M02 Gate C2A — Hosted Supabase Read-Only Preflight & Migration Dry Run Report

> **Milestone:** M02 — Database Integration & RLS Foundation  
> **Gate:** Gate C2A — Hosted Supabase Read-Only Preflight & Migration Dry Run  
> **Status:** **BLOCKED (ACTIONABLE AUTHENTICATION & NETWORK PRECONDITIONS)**  
> **Date:** 2026-11-18  
> **Branch:** `feat/m02-database`  
> **Baseline Commit:** `096b86ab7cb64ecbe10293c686f881d93da3e77d` (`096b86a`)  
> **Target Project Reference:** `zvmjdssztebhzpplkcrn` (`asmkhalid111's Portfolio`)  
> **Executing Engineer:** Senior Supabase Deployment Engineer & PostgreSQL Security Auditor  

---

## 1. Executive Summary & Scope Boundaries

In accordance with explicit Project Owner authorization:
> *"I AUTHORIZE M02 GATE C2A: HOSTED SUPABASE READ-ONLY PREFLIGHT AND MIGRATION DRY RUN ONLY."*

Gate C2A was executed strictly as a **read-only inspection and migration dry run**. 

### Absolute Environment Safety Confirmation:
- **Zero Hosted Migrations Executed**: No `CREATE`, `ALTER`, `DROP`, `GRANT`, `REVOKE`, `INSERT`, `UPDATE`, or `DELETE` statements were executed against the hosted database.
- **Zero Remote Mutations**: No Auth users created, no Storage buckets modified, no settings altered on project `zvmjdssztebhzpplkcrn`.
- **Zero Seed Uploads**: No test fixtures or development seed data were sent to the cloud.
- **Zero Production Deployments**: Vercel production deployment was untouched.
- **Zero Git Remote Pushes**: All work remains strictly local on branch `feat/m02-database`.

### Overall Outcome:
**Verdict: M02 GATE C2A BLOCKED**  
While all local migration packages, checksums, and CLI v3 capabilities were verified, remote inspection of the hosted Supabase database is blocked by two technical preconditions:
1. **Unauthenticated CLI State**: The local Supabase CLI is not currently authenticated with the Supabase Management API (`AccessTokenRequiredError`).
2. **Free-Tier IPv6 Network Constraint**: Direct database connections to Supabase Free Tier (`db.zvmjdssztebhzpplkcrn.supabase.co`) use IPv6 by default. The local host network interface currently lacks IPv6 routing (`DbConfigIpv6Error`). When authenticated, the CLI resolves pooler configuration over IPv4 via the Management API.

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

The following read-only commands were executed to inspect the remote environment:

```
$ npx supabase projects list
Exit Code: 1
Diagnostic:
{"_tag":"Error","error":{"code":"AccessTokenRequiredError","message":"Access token not provided. Supply an access token by running `supabase login` or setting the SUPABASE_ACCESS_TOKEN environment variable."}}

$ npx supabase db query "SELECT current_database();" --read-only --remote=zvmjdssztebhzpplkcrn
Target: project zvmjdssztebhzpplkcrn
Exit Code: 1
Diagnostic:
{"target":{"kind":"linked","project_ref":"zvmjdssztebhzpplkcrn","environment":"unverified"},"_tag":"Error","error":{"code":"DbQueryLoginRequiredError","message":"Access token not provided. Supply an access token by running `supabase login` or setting the SUPABASE_ACCESS_TOKEN environment variable.","suggestion":"Run supabase login first."}}

$ npx supabase migration list --remote=zvmjdssztebhzpplkcrn
Target: project zvmjdssztebhzpplkcrn
Exit Code: 1
Diagnostic:
{"target":{"kind":"linked","project_ref":"zvmjdssztebhzpplkcrn","environment":"unverified"},"_tag":"Error","error":{"code":"DbConfigIpv6Error","message":"IPv6 is not supported on your current network","suggestion":"Pass the project's connection pooler URL with --remote=<pooler db-url> to connect over IPv4."}}

$ npx supabase db push --dry-run --remote=zvmjdssztebhzpplkcrn --skip-vault
Target: project zvmjdssztebhzpplkcrn
Exit Code: 1
Diagnostic:
{"target":{"kind":"linked","project_ref":"zvmjdssztebhzpplkcrn","environment":"unverified"},"_tag":"Error","error":{"code":"DbConfigIpv6Error","message":"IPv6 is not supported on your current network","suggestion":"Pass the project's connection pooler URL with --remote=<pooler db-url> to connect over IPv4."}}
```

### Technical Root Cause Analysis:
1. **Management API Authentication**: Commands querying the Supabase API directly (`projects list`, `db query`) fail because the local developer environment has not yet run `supabase login`.
2. **Direct PostgreSQL DNS vs. Network Capabilities**: Commands attempting direct database connections (`migration list`, `db push`) resolve `db.zvmjdssztebhzpplkcrn.supabase.co`. Supabase Free tier provides direct database connections over IPv6 only. Because the local host network interface does not have IPv6 connectivity, direct connection attempts fail with `DbConfigIpv6Error`.
3. **Connection Pooling Resolution**: Once the CLI is authenticated via `supabase login`, it can query the Management API to obtain the project's IPv4 Supavisor connection pooler configuration (`aws-0-ap-south-1.pooler.supabase.com`), resolving the IPv6 limitation over IPv4.

---

## 8. Credential Safety & Hygiene Audit

- **Zero Plaintext Token Storage**: No access tokens, database passwords, or personal credentials were requested, printed, or recorded in Antigravity chat, shell logs, or Markdown reports.
- **Environment Isolation**: `.env.local` contains the public URL and modern publishable key (`sb_publishable_...`). It remains untracked in Git (`.gitignore:36:.env*.local`).
- **No Insecure Flags**: `--token` was never invoked on the command line; `--debug` was never run in the presence of credentials.
- **Git History Hygiene Reminder**: Commit `276bea3` contains the local CLI demonstration key (`iss: "supabase-demo"`). It possesses zero authority over `zvmjdssztebhzpplkcrn`. Recommended cleanup: squash `feat/m02-database` prior to merge to `main` upon Project Owner approval.

---

## 9. Gate C2A Classification & Readiness Scorecard

| Condition | Invariant Requirement | Observed State | Status |
|:---|:---|:---|:---:|
| **A. Target Identity** | Exactly matches `zvmjdssztebhzpplkcrn` | Targeted `project zvmjdssztebhzpplkcrn` in all invocations | **PASS** |
| **B. Access Control** | Authenticated read-only access established | Unauthenticated CLI (`AccessTokenRequiredError`) | **BLOCKED** |
| **C. Migration History** | Remote history table inspected and verified | Remote history unreachable without login / pooler | **BLOCKED** |
| **D. Schema Compatibility** | No conflicting application tables on hosted DB | Remote query unreachable without login / pooler | **BLOCKED** |
| **E. Seed Exclusion** | Development seed files unambiguously excluded | Confirmed excluded in CLI v3; no `--include-seed` flag | **PASS** |
| **F. SQL Migration Scope** | Exactly 3 approved migrations, checksums verified | Verified 3 migrations match v0.3 specifications | **PASS** |
| **G. Security & Privacy** | Zero credentials printed, committed, or exposed | Clean; no tokens or passwords exposed | **PASS** |
| **H. Production Integrity** | Strictly read-only; zero mutations to hosted project | Zero hosted changes executed | **PASS** |

### **FINAL VERDICT: M02 GATE C2A BLOCKED**

---

## 10. Actionable Preconditions for Unblocking Gate C2A / C2B

To complete the remote preflight inspection without compromising security:

1. **Owner Interactive Login**:
   The Project Owner should execute the following command in their local interactive terminal:
   ```powershell
   npx supabase login
   ```
   This will open a secure browser session on `supabase.com` where the owner can authorize the CLI privately.
2. **Re-Run Read-Only Preflight**:
   Once authenticated, re-run the read-only preflight commands:
   ```powershell
   npx supabase projects list
   npx supabase migration list --remote=zvmjdssztebhzpplkcrn
   npx supabase db push --dry-run --remote=zvmjdssztebhzpplkcrn --skip-vault
   ```
3. **Gate C2B Strict Stop**:
   Gate C2B (actual cloud database migration) remains **LOCKED** until Gate C2A is unblocked, completed, documented, and approved by ChatGPT and the Project Owner.
