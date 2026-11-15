# Project Memory — Durable State & Architecture Context

> **Last Updated:** 2026-11-15  
> **Current State:** **M01 GATE A COMPLETED — AWAITING CHATGPT AUDIT & OWNER AUTHORIZATION FOR GATE B**  
> **Active Milestone:** `docs/milestones/M01-foundation/PLAN.md` (v0.2)  
> **Gate A Report:** `docs/milestones/M01-foundation/GATE_A_REPORT.md` (Local Foundation Verified)

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
  - Implementation Plan: `docs/milestones/M01-foundation/PLAN.md` (v0.2).
  - Gate A Status: **COMPLETED & LOCALLY VERIFIED**.
  - Local Quality Gates: All 5 passed (`lint`, `typecheck`, `test`, `build`, `test:e2e`).
  - Report created: `docs/milestones/M01-foundation/GATE_A_REPORT.md`.
  - Git repository status: **NOT INITIALIZED** (strictly deferred to Gate B).
  - Remote cloud status: **NO REMOTE RESOURCES ACCESSED OR CREATED** (deferred to Gate B & C).

---

## 4. Next Actions

1. Independent audit of `docs/milestones/M01-foundation/GATE_A_REPORT.md` by ChatGPT.
2. Explicit Project Owner authorization to proceed with Gate B (Git initialization, initial commit, GitHub remote creation).
3. Explicit Project Owner authorization for Gate C (Vercel project linking and initial preview/production deployment).
