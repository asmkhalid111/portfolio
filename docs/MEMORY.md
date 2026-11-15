# Project Memory — Durable State & Architecture Context

> **Last Updated:** 2026-11-16  
> **Current State:** **M01 GATE B COMPLETED (CI EXCEPTION APPROVED) — GATE C DEPLOYMENT PREPARED (Awaiting Project Owner Authorization)**  
> **Active Milestone:** `docs/milestones/M01-foundation/PLAN.md` (v0.5)  
> **Gate A Report:** `docs/milestones/M01-foundation/GATE_A_REPORT.md` (Accepted by ChatGPT)  
> **Gate B1 Report:** `docs/milestones/M01-foundation/GATE_B_LOCAL_REPORT.md` (Accepted by ChatGPT)  
> **Gate B2A Report:** `docs/milestones/M01-foundation/GATE_B_PRIVACY_REPORT.md` (History Sanitization Verified)  
> **Gate B2 Report:** `docs/milestones/M01-foundation/GATE_B_GITHUB_REPORT.md` (Repository Published, CI Blocked)  
> **Gate C Preparation:** `docs/milestones/M01-foundation/GATE_C_PREPARATION.md` (Deployment Checklist & CI Waiver)

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
  - Pushed Baseline Commit: `e2102d9` (clean history, zero personal email occurrences).
  - CI Status: GitHub Actions runner refused due to account billing lock (`ERR-006`); controlled exception granted waiving CI badge as blocking gate; workflow retained intact; 12-point alternative verification protocol in effect.
  - Gate C Preparation: `docs/milestones/M01-foundation/GATE_C_PREPARATION.md` (ready for deployment upon explicit owner authorization).
  - Reports: `docs/milestones/M01-foundation/GATE_A_REPORT.md`, `GATE_B_LOCAL_REPORT.md`, `GATE_B_PRIVACY_REPORT.md`, `GATE_B_GITHUB_REPORT.md`, and `GATE_C_PREPARATION.md`.

---

## 4. Next Actions

1. Await explicit Project Owner authorization for M01 Gate C (Vercel deployment).
2. Connect `asmkhalid111/portfolio` to Vercel Hobby, verify Node.js 26 runtime, deploy the approved foundation shell, and verify live HTTPS URL.
3. Perform live production smoke test (desktop & mobile).
4. Author `docs/milestones/M01-foundation/COMPLETION.md` and submit to ChatGPT for milestone completion audit.
5. Project Owner resolves GitHub billing lock at leisure; runner will automatically resume when unlocked.
