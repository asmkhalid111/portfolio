# Project Memory — Durable State & Architecture Context

> **Last Updated:** 2026-11-16
> **Current State:** **M02 PLANNING (GATE A v0.2 REVISION) — BRANCH feat/m02-database — AWAITING CHATGPT AUDIT & OWNER APPROVAL**
> **Active Milestone:** `docs/milestones/M02-database/PLAN.md` (Awaiting Review, v0.2)
> **M01 Completion Report:** `docs/milestones/M01-foundation/COMPLETION.md` (Accepted & Finalized, Tag `m01-complete` at `699cfd0`)
> **M02 Plan:** `docs/milestones/M02-database/PLAN.md` (Revised v0.2)
> **M02 Schema Spec:** `docs/milestones/M02-database/SCHEMA_SPEC.md` (Revised v0.2)
> **M02 RLS Matrix:** `docs/milestones/M02-database/RLS_MATRIX.md` (Revised v0.2)

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

## 4. Next Actions

1. Await ChatGPT architecture and security audit of Milestone M02 Gate A planning documents (`docs/milestones/M02-database/PLAN.md`, `SCHEMA_SPEC.md`, `RLS_MATRIX.md`).
2. Project Owner reviews ChatGPT audit and provides explicit authorization for Gate B (Supabase provisioning).
3. Upon Gate B authorization, Project Owner provisions Supabase free-tier project and populates `.env.local` with real credentials.
4. Antigravity proceeds to Gate B (local configuration, package install, `.env.example`).
5. Strictly NO database code implementation, migration execution, or cloud modifications until gated authorization is received.
