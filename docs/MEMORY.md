# Project Memory — Durable State & Architecture Context

> **Last Updated:** 2026-11-18
> **Current State:** **M02 GATE C2B (CONTROLLED HOSTED SUPABASE MIGRATION COMPLETE & VERIFIED — PASS WITH CONDITIONS) — BRANCH feat/m02-database — AWAITING CHATGPT REVIEW & OUT-OF-BAND ADMIN PROVISIONING AUTHORIZATION**
> **Active Milestone:** `docs/milestones/M02-database/PLAN.md` (Approved Architecture v0.3)
> **M01 Completion Report:** `docs/milestones/M01-foundation/COMPLETION.md` (Accepted & Finalized, Tag `m01-complete` at `699cfd0`)
> **M02 Gate B Report:** `docs/milestones/M02-database/GATE_B_SETUP_REPORT.md` (Completed - Health Check 200 OK Verified)
> **M02 Gate C1 Report:** `docs/milestones/M02-database/GATE_C1_LOCAL_IMPLEMENTATION_REPORT.md` (Completed - 38/38 Tests Passed)
> **M02 Gate C2A Report:** `docs/milestones/M02-database/GATE_C2A_HOSTED_PREFLIGHT_REPORT.md` (Completed - PASS WITH CONDITIONS)
> **M02 Gate C2B Report:** `docs/milestones/M02-database/GATE_C2B_HOSTED_MIGRATION_REPORT.md` (Completed - PASS WITH CONDITIONS)
> **M02 Plan:** `docs/milestones/M02-database/PLAN.md` (Revised v0.3)
> **M02 Schema Spec:** `docs/milestones/M02-database/SCHEMA_SPEC.md` (Revised v0.3)
> **M02 RLS Matrix:** `docs/milestones/M02-database/RLS_MATRIX.md` (Revised v0.3)

---

## 1. Confirmed & Approved Scope

- **Core Mission:** Distinctive personal software engineering portfolio with an authenticated administrator CRUD dashboard, prioritized for university assessment marks.
- **Approved Architecture Baseline:**
  - Full-stack unified Next.js 16 App Router (Active LTS, baseline `16.4.6`).
  - React 19, TypeScript strict mode, Tailwind CSS v4 (`@theme` design tokens).
  - Vercel Hobby hosting ($0/mo, personal non-commercial tier).
  - Supabase Free tier (PostgreSQL, Auth, Storage) — **deferred to M02**.
  - Package manager: `npm` (v11.19.0) with committed `package-lock.json`.
- **Approved Milestone Sequence:** M00 through M10, with M04 (Projects CRUD vertical slice) taking precedence over M05 (public portfolio styling).
- **Approved Decision Records:** ADR-000 through ADR-006 documented in `docs/DECISIONS.md`.

---

## 2. Key Technical Safeguards Established in M00

1. **Non-Destructive Scaffolding in M01:** Scaffold Next.js 16 in a temporary directory (`temp-scaffold`) using `--disable-git` and `--skip-install`, execute an inventory diff, transfer runtime/build files, and verify local compilation before proceeding. Never overwrite governance files (`AGENTS.md`, `README.md`, `docs/`, `prompts/`).
2. **Supabase Deferral:** M01 deploys a minimal public application shell with zero Supabase credentials or database connections. Supabase library installation and database provisioning are deferred to M02.
3. **Database Security Invariants:** Database functions use `SECURITY DEFINER SET search_path = ''` with schema-qualified identifiers and revoked public execution. Admin accounts are provisioned out-of-band by the owner via direct SQL insertion into `public.admin_users`. Table privileges (`GRANT`) must be coordinated with RLS policies.
4. **Strict Draft Isolation:** Public requests for draft projects must strictly return HTTP 404 (Not Found) without leaking draft content into HTML, metadata, or JSON payloads.
5. **Pre-Publication Scan:** Mandatory scan across all tracked workspace files (including `docs/`, `prompts/`, `README.md`) before making the repository public or deploying to Vercel in M01.
6. **SQL Migration Safety:** `supabase/migrations/*.sql` and `supabase/seed.sql` remain tracked in Git; `supabase/backups/` and `*.sql` snapshot dumps are strictly ignored.

---

## 3. Milestone Progress Log

- **M00 (Discovery, Architecture & Governance):**
  - Architecture Plan v0.3: **APPROVED BY CHATGPT**.
  - Governance Documentation Synchronization: **IMPLEMENTED**.
  - Completion Report created: `docs/milestones/M00-discovery/COMPLETION.md`.
  - ChatGPT Completion Audit: **PASSED**.
  - Final Milestone Status: **ACCEPTED**.
- **M01 (Environment, Foundation & First Deploy):**
  - Implementation Plan: `docs/milestones/M01-foundation/PLAN.md` (v0.5).
  - Gate A Status: **COMPLETED, VERIFIED & ACCEPTED BY CHATGPT**.
  - Gate B1 Status: **COMPLETED & LOCALLY COMMITTED**.
  - Gate B2A Status: **COMPLETED & VERIFIED** (all commit metadata and tracked content sanitized).
  - Gate B2 Status: **REPOSITORY CREATED & PUSHED — CI EXCEPTION APPROVED (ADR-009)**.
  - GitHub Remote: `https://github.com/asmkhalid111/portfolio` (public, tracked to `origin/main`).
  - Verified Git Author: `Ashrafuzzaman Khalid <130174468+asmkhalid111@users.noreply.github.com>`.
  - Pushed Baseline Commit: `699cfd0` (clean history, zero personal email occurrences).
  - CI Status: GitHub Actions runner refused due to account billing lock (`ERR-006`); controlled exception granted waiving CI badge as blocking gate; workflow retained intact; 12-point alternative verification protocol in effect.
  - Gate C Status: **DEPLOYED & EMPIRICALLY VERIFIED**.
  - Production Deployment URL: `https://portfolio-rust-nu-n7jcvs7adw.vercel.app`
  - Live Playwright Tests: 24/24 assertions passed (100% success rate across Desktop and Mobile viewports).
  - Milestone Finalization: **ACCEPTED & CLOSED**.
  - Verified Release Tag: `m01-complete` targeting application source commit `699cfd0dc0bf43621d62eb0a969f5d0ac8f73d1b`.
  - Completion Report: `docs/milestones/M01-foundation/COMPLETION.md`.
  - Reports: `docs/milestones/M01-foundation/GATE_A_REPORT.md`, `GATE_B_LOCAL_REPORT.md`, `GATE_B_PRIVACY_REPORT.md`, `GATE_B_GITHUB_REPORT.md`, `GATE_C_PREPARATION.md`, `GATE_C_DEPLOYMENT_REPORT.md`, and `COMPLETION.md`.

---

- **M02 (Database Integration & RLS Foundation):**
  - Architecture Specifications: `docs/milestones/M02-database/PLAN.md`, `SCHEMA_SPEC.md`, `RLS_MATRIX.md` (all v0.3 accepted).
  - Gate B (Setup & Local Configuration): **COMPLETED & VERIFIED** (`GATE_B_SETUP_REPORT.md`).
  - Gate C1 (Local Database Implementation & Validation): **COMPLETED & VERIFIED** (`GATE_C1_LOCAL_IMPLEMENTATION_REPORT.md`).
    - Local disposable Supabase stack operational (`127.0.0.1:54321` / `54322`).
    - 3 version-controlled SQL migrations created and validated in `supabase/migrations/`.
    - Local seed fixtures in `supabase/seed.sql` validated.
    - Clean rebuild replay reproducibility verified via consecutive `npx supabase db reset` executions.
    - Generated TypeScript types: `src/lib/supabase/types.ts`.
    - Typed SSR client factories: `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`.
    - Zero production route imports (`src/app/` decoupled).
    - 38/38 primary security and constraint tests passed (26 Data API + 12 Kernel SQL).
    - 8/8 supplementary trigger state machine tests passed (`TRG-01` to `TRG-08`). Total suite: 46/46 passed.
    - Test harness hardened: Zero embedded credentials (dynamic loading via ignored `.env.test.local` / CLI `status -o json`), fail-closed loopback guards, cryptographically valid expired JWT (`API-24` asserts `PGRST303`), multi-stage cascade assertions (`API-22`), strict equality checks without false positives (`API-09`), exact 5-character SQLSTATE assertions (`SQL-01` through `SQL-12`).
    - All local quality gates passed (lint 0/0, typecheck clean, unit tests 4/4, build clean, e2e 12/12, `npm audit --omit=dev` 0 vulnerabilities).
    - Dev tools: 17 advisories in `minimatch`/`picomatch` (`npm audit`).
    - PostgREST unexposed schema error code empirically reconciled to `PGRST205` / HTTP 404 for `API-15`, `API-16`, and `API-26`.
    - Custom WSL2 Docker wrapper audited (`docker.exe` via `CreateProcessA` to `wsl.exe -e docker`), logging routine stripped, `docker_call.log` deleted, keepalive daemon noted (`task-2256`).
    - Git history audit: Commit `276bea3` documented with local demo key; recommendation to squash/rebase `feat/m02-database` before merge into `main` pending owner authorization.
    - Strictly local execution: Zero remote Supabase modifications (`zvmjdssztebhzpplkcrn` untouched), zero remote Git pushes, zero Vercel deployments.
  - Gate C2A (Hosted Supabase Read-Only Preflight & Migration Dry Run): **COMPLETED & RECONCILED — STATUS: PASS WITH CONDITIONS** (`GATE_C2A_HOSTED_PREFLIGHT_REPORT.md`).
    - Authenticated CLI via interactive `npx supabase login`; verified project `zvmjdssztebhzpplkcrn` (`asmkhalid111's Portfolio`, `ap-south-1`, PostgreSQL `17.12.0.000`, status `ACTIVE_HEALTHY`, `created_at: 2026-11-17T13:58:57.520846Z`, `linked: false`).
    - Verified migration file checksums on disk: Migration 1 `E52F1C34...`, Migration 2 `78FDCD22...`, Migration 3 `26AB5608...` (LF line endings; `git diff 096b86a..HEAD -- supabase/migrations/` clean and unchanged).
    - Scope strictly read-only for application objects: Zero application migrations executed, zero application tables created, zero seed data uploaded (`seeds: []`), zero Auth accounts created, zero Vercel deployments.
    - PostgreSQL catalog inspected via read-only queries: `private` schema absent, `supabase_migrations` absent, application tables `projects`, `project_media`, `admin_users` absent (target application scope checked).
    - Remote migration list: 3 local migrations pending (`20261116000001`, `20261116000002`, `20261116000003`), 0 remote applied.
    - Migration dry run executed: `npx supabase db push --dry-run --remote=zvmjdssztebhzpplkcrn --skip-vault` reported `dryRun: true`, `upToDate: false`, exactly 3 migrations, `seeds: []`, `roles: []` (where `roles: []` indicates zero custom declarative role migrations pending).
    - Post-dry-run application database integrity verified: `to_regclass('public.projects')` remains `null`.
    - Platform login-role exception disclosed: Supabase cloud control plane provisioned short-lived `cli_login_postgres` (5-minute rolling TTL) to broker token authentication over connection pooling. Formally recorded as a C2A authorization-boundary exception requiring explicit Project Owner acknowledgement before Gate C2B.
    - IPv4 routing: Authenticated CLI queries Management API and routes over IPv4 Supavisor Session pooler (port 5432), completely bypassing IPv6 direct-connection limitations.
    - Gate C2B (Hosted Database Migration Execution) transitioned to **AUTHORIZED & EXECUTED**.
  - Gate C2B (Controlled Hosted Supabase Migration & Security Verification): **COMPLETED & VERIFIED — STATUS: PASS WITH CONDITIONS** (`GATE_C2B_HOSTED_MIGRATION_REPORT.md`).
    - Manual Owner Execution: Executed interactively in external terminal without `--yes` flag (`npx supabase db push --remote=zvmjdssztebhzpplkcrn --skip-vault`); exit code `0`.
    - Migration History: All 3 approved migrations (`20261116000001`, `20261116000002`, `20261116000003`) registered remotely; 0 pending.
    - Schema Verified: `private.admin_users`, `public.projects`, `public.project_media` created with all approved constraints and types.
    - Foreign Key Integrity: `project_media(project_id) -> projects(id)` with `ON DELETE CASCADE` verified.
    - Triggers Verified: `trg_projects_published_at` and `trg_projects_updated_at` enabled.
    - Functions Verified: `private.is_admin()` (`SECURITY DEFINER`, `search_path = ''`, owner `postgres`, execute revoked from public, granted to authenticated).
    - RLS Verified: Enabled and forced (`relrowsecurity: true`, `relforcerowsecurity: true`) on all three tables. 5 policies on `projects`, 5 on `project_media`, 0 on `admin_users`. Table privileges audited.
    - Seed Exclusion Verified: Zero seed rows inserted; `count = 0` on all three tables.
    - PostgREST Data API Verified: Public `GET /rest/v1/projects` returns `[]` (HTTP 200); `GET /rest/v1/project_media` returns `[]` (HTTP 200); `GET /rest/v1/admin_users` returns HTTP 404 (`PGRST205`).
    - Out-of-band Administrator Provisioning: `private.admin_users` remains empty; initial administrator account deferred to separate authorized dashboard insertion.

---

## 4. Next Actions

1. Submit Gate C2B report (`docs/milestones/M02-database/GATE_C2B_HOSTED_MIGRATION_REPORT.md`) for ChatGPT and Project Owner review.
2. Project Owner to authorize and perform out-of-band initial administrator insertion into `private.admin_users` via Supabase Dashboard SQL Editor.
3. Verify administrator authentication and RLS functionality post-insertion.
4. Prepare for M02 final milestone review and completion.
5. GitHub remote push and Vercel production deployment remain strictly locked.
