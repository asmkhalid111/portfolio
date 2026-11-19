# Milestone Completion Report: R03 — Public Portfolio

**Milestone:** R3 (R3.1 – R3.4) — Public Portfolio & Project Case Studies  
**Project:** Portfolio (3-Day MVP Target)  
**Workspace:** `E:\Codes\Portfolio`  
**Active Scope Reference:** [MVP_SCOPE.md](file:///e:/Codes/Portfolio/MVP_SCOPE.md)  
**Date:** 2026-11-19  
**Status:** **COMPLETE & FUNCTIONALLY VERIFIED (PASS)**  

---

## 1. Executive Summary

Milestone R3 delivers the complete public-facing portfolio website, integrating verified curriculum vitae content with live Supabase database records and Next.js 16 App Router dynamic routing.

The milestone was implemented across four focused sub-milestones:

- **R3.1 (Public Homepage & Verified CV Sections):** Updated `src/app/page.tsx` with five semantic sections:
  1. *Hero / About:* Public identity (Ashrafuzzaman Khalid, Dhaka, Bangladesh), professional headline, and engineering focus.
  2. *Education:* Daffodil International University, B.Sc. in Computer Science & Engineering (2023 – Present), CGPA 3.67 / 4.00, with unverified coursework removed.
  3. *Work Experience:* Codveda Technologies, Java Development Intern (Remote, May–July 2026), reflecting verified core Java and OOP development.
  4. *Technical Skills:* Structured into Programming Languages, Frameworks & Backend (retaining Spring Boot), Databases & Storage, and Engineering Tools.
  5. *Contact & Profiles:* Direct verified links to GitHub (`asmkhalid111`) and LinkedIn (`asmkhalid101`). Privacy invariant strictly enforced (zero phone numbers, street addresses, or raw CV files).
- **R3.2 (Published Project Cards):** Converted `HomePage` into an async Server Component querying `public.projects` with `status = 'published'`, ordered by `sort_order ASC, created_at DESC`. Rendered responsive cards with title, summary, technology badges, and external repository/live-demo links. Enforced database Row-Level Security (`projects_public_select`) and implemented empty state and query error fallbacks.
- **R3.3 (Project Detail Pages):** Created `src/app/projects/[slug]/page.tsx` supporting dynamic routing. Fetched project case studies by `slug` and `status = 'published'`, rendering *Problem & Context*, *Architecture & Approach*, and *Outcomes & Results* strictly when database columns contain data. Enforced 404 isolation for draft and nonexistent slugs, separated database errors from 404 responses, and added back navigation to `/#projects`. Linked homepage cards directly to detail views.
- **R3.4 (Final Integration Verification):** Conducted consolidated end-to-end testing across desktop and mobile viewports, verified draft isolation, 404 responses, back navigation, authenticated admin access to `/admin/projects`, TypeScript compilation, and recorded genuine findings.

---

## 2. Actual Verification Results

All functional tests executed against the live application running on `http://localhost:3000` backed by local Supabase (`http://127.0.0.1:54321` with PostgreSQL on `54322`).

| Test Item | Verification Target | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **R3-V1** | Homepage CV Sections | Hero, Education, Experience, Skills, Contact all visible | All 5 semantic sections visible with verified facts only | **PASS** |
| **R3-V2** | Published Project Display | `Distributed Task Orchestrator` visible in `#projects` | Card rendered with title, summary, tags, and external links | **PASS** |
| **R3-V3** | Draft Project Isolation | `Autonomous Code Auditor` (draft) hidden from public | Completely absent from homepage and public project listing | **PASS** |
| **R3-V4** | Detail Page Navigation | Card click opens `/projects/distributed-task-orchestrator` | Detail page loaded with full narrative sections and links | **PASS** |
| **R3-V5** | Draft Slug 404 Protection | Direct visit to `/projects/autonomous-code-auditor` | Returned HTTP 404 status and Next.js 404 UI | **PASS** |
| **R3-V6** | Nonexistent Slug 404 | Direct visit to `/projects/nonexistent-project-xyz` | Returned HTTP 404 status and Next.js 404 UI | **PASS** |
| **R3-V7** | Back Navigation | Clicking "Back to Projects" from project detail view | Smoothly navigated back to `http://localhost:3000/#projects` | **PASS** |
| **R3-V8** | Admin Projects Access | Authenticated admin visits `/admin/projects` | Loaded dashboard projects table with `New Project` link | **PASS** |
| **R3-V9** | Desktop / Mobile Layout | Viewports: 1280x800 and 375x667 on `/` and `/projects/*` | Zero horizontal scroll overflow (`scrollWidth === clientWidth`) | **PASS** |
| **R3-V10** | TypeScript Strict Check | `npm run typecheck` (`tsc --noEmit`) | 0 type errors across all files | **PASS** |
| **R3-V11** | Production Build | `npm run build` (Turbopack) | Prerender error on dynamic runtime routes (see Section 5) | **NOTE** |

---

## 3. Commands Executed & Exit Codes

```text
# 1. TypeScript Strict Typecheck
npm run typecheck
Exit Code: 0 (0 errors)

# 2. Automated End-to-End Integration Suite (Playwright Headless Chromium)
node scratch/verify-r34-final-integration.mjs
Exit Code: 0 (All 7 functional criteria passed)

# 3. Production Build Test
npm run build
Exit Code: 1 (Next.js 16 Partial Prerendering requires explicit dynamic opt-out on runtime routes)
```

---

## 4. Files Created or Modified

### New Files Created
- [docs/milestones/R03-public-portfolio/COMPLETION.md](file:///e:/Codes/Portfolio/docs/milestones/R03-public-portfolio/COMPLETION.md) (Consolidated R3 milestone report)
- [src/app/projects/[slug]/page.tsx](file:///e:/Codes/Portfolio/src/app/projects/[slug]/page.tsx) (Dynamic project detail Server Component)

### Files Modified
- [src/app/page.tsx](file:///e:/Codes/Portfolio/src/app/page.tsx) (Public homepage: verified CV sections, Supabase published projects query, responsive project cards, and links to detail pages)

---

## 5. Genuine Findings & Route Configuration Note for R4

During `npm run build`, Next.js 16 (with `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`) exited during static page prerendering with:
```text
Error: Route "/": Next.js encountered uncached or runtime data during prerendering.
`cookies()` accessed outside of `<Suspense>` prevents the route from being prerendered.
Ways to fix this: Set export const instant = false to allow a blocking route
```

- **Root Cause:** Both `src/app/page.tsx` and `src/app/projects/[slug]/page.tsx` utilize `createClient()` from `@/lib/supabase/server`, which reads server cookies. In Next.js 16, dynamic routes reading uncached runtime data must declare `export const instant = false;` (matching existing routes in `src/app/admin/(dashboard)/layout.tsx`, `src/app/admin/(dashboard)/projects/page.tsx`, and `src/app/auth/pending-approval/page.tsx`).
- **Remediation for Milestone R4 (Deployment):** Add `export const instant = false;` to `src/app/page.tsx` and `src/app/projects/[slug]/page.tsx` as part of the initial deployment configuration slice in R4. Application code was kept untouched in R3.4 per the "do not modify application code" instruction.

---

## 6. Git & Working-Tree Status

- **Active Branch:** `feat/m03-auth`
- **Baseline HEAD Commit:** `5f1920f729145899cb53e77f0cf70e21116c8b2b`
- **Working Tree State:** All uncommitted changes from R1, R2, and R3 are preserved locally.
- **Remote Operations:** Strictly ZERO hosted Supabase changes, GitHub pushes, branch merges, or Vercel deployments.

---

## 7. Next Milestone Gating

- **Milestone R3 Status:** Complete, verified, and documented on disk.
- **Next Active Milestone:** **Milestone R4 — Vercel Deployment & Teacher Demonstration** (Awaiting explicit owner approval).
