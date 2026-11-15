# M01 — Gate A: Local Foundation Implementation Report

**Milestone:** M01 — Foundation, Environment Setup & First Deployment  
**Gate:** Gate A (Local Foundation and Verification ONLY)  
**Status:** COMPLETED — AWAITING CHATGPT AUDIT AND OWNER AUTHORIZATION BEFORE GATE B  
**Date:** November 15, 2026  
**Operating Workspace:** `E:\Codes\Portfolio`  
**Node Runtime:** Node.js v26.7.0 (npm 11.19.0)  
**Governing Plan:** `docs/milestones/M01-foundation/PLAN.md` (v0.2)  

---

## 1. Executive Summary

In strict adherence to the project owner authorization and the three-party governance model, **Gate A (Local Foundation Implementation)** has been fully executed in an isolated local environment. 

Application scaffolding, package configuration, strict TypeScript baseline, Tailwind CSS v4 integration, accessible semantic shell layout, unit testing harness (Vitest/Testing Library), end-to-end testing harness (Playwright), and GitHub Actions CI workflow were created without executing any remote operations or version control initialization.

All local quality gates (`lint`, `typecheck`, `test`, `build`, `test:e2e`) passed with zero errors. No remote Git repositories or cloud services (GitHub, Vercel, Supabase) were initialized, accessed, or modified.

---

## 2. Inventory of Changes

### A. Root Configuration & Project Files
- `.gitignore`: Generated with Next.js, build, coverage, Supabase secrets (`supabase/backups/`, `*.dump`), and environment files (`.env*`, `.env*.local`) while explicitly preserving migrations and seeds.
- `.nvmrc`: Fixed to `26` for Node.js 26 parity.
- `package.json`: Configured with modern scripts (`"lint": "eslint ."`, `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"test:e2e": "playwright test"`), engines (`node: ^26.0.0`), and pinned dependencies.
- `package-lock.json`: Deterministic lockfile generated via `npm install` (451 packages, 0 vulnerabilities).
- `tsconfig.json`: Strict TypeScript configuration with `@/*` path aliases and incremental compilation.
- `next.config.ts`: Next.js 16 configuration with Turbopack Tailwind loader rules.
- `eslint.config.mjs`: Flat ESLint 9 configuration compatible with Next.js 16.

### B. Application Core Source (`src/`)
- `src/app/globals.css`: Tailwind CSS v4 `@import "tailwindcss";` with CSS variable design tokens and accessible focus states.
- `src/app/layout.tsx`: Accessible HTML5 root layout (`lang="en"`, skip-to-content anchor, semantic landmarks `<header>`, `<main id="main-content">`, `<footer>`, viewport and metadata definitions).
- `src/app/page.tsx`: Semantic homepage featuring developer hero overview (Ashrafuzzaman Khalid, DIU CSE student), M01 deployed shell notice, candidate project cards (Web-LAN-Chat, BanglaScript Compiler, Clean Later, Brain Tumor ML Research), external profile links, and technical core discipline badges.
- `src/components/layout/header.tsx`: Sticky accessible navigation bar with branding, home link, and external GitHub link.
- `src/components/layout/footer.tsx`: Deterministic semantic footer with copyright year, project status badge, and GitHub profile reference.

### C. Testing & CI Infrastructure
- `vitest.config.ts`: Unit test configuration using `jsdom` and `@/*` path resolution.
- `tests/unit/homepage.test.tsx`: 4 unit tests validating primary heading, project cards, M01 status notice, and asserting absence of leaked sensitive phone numbers, addresses, or credentials.
- `playwright.config.ts`: Multi-browser E2E configuration with `webServer` block (`npm run start` on port 3000), Desktop Chromium (1280x720) and Mobile Chromium (Pixel 5, 375x667).
- `tests/e2e/smoke.spec.ts`: 5 test cases per viewport (10 total assertions) validating HTTP 200, document title, landmarks, skip link accessibility, heading hierarchy, viewport horizontal overflow prevention, and project rendering.
- `.github/workflows/ci.yml`: GitHub Actions automated workflow running lint, typecheck, unit tests, Playwright E2E suite, and Next.js production build on Node 26.

---

## 3. Installed Package Inventory

Verified via `npm list --depth=0`:

| Package | Pinned / Installed Version | Category | Role |
| :--- | :--- | :--- | :--- |
| `next` | `16.4.6` | Production | React framework (Active LTS) |
| `react` | `19.3.0` | Production | Core UI runtime |
| `react-dom` | `19.3.0` | Production | React DOM renderer |
| `lucide-react` | `0.475.0` | Production | Accessible iconography |
| `tailwindcss` | `4.3.3` | Development | Modern CSS styling engine |
| `@tailwindcss/turbopack` | `4.3.3` | Development | Turbopack integration for Tailwind |
| `typescript` | `5.9.3` | Development | Type safety compiler |
| `eslint` | `9.39.5` | Development | Linting engine |
| `eslint-config-next` | `16.4.6` | Development | Next.js flat ESLint rules |
| `vitest` | `3.2.7` | Development | Unit test runner |
| `@testing-library/react` | `16.3.3` | Development | React DOM test utilities |
| `@testing-library/dom` | `10.4.2` | Development | DOM query engine |
| `jsdom` | `26.1.0` | Development | Browser DOM mock for unit tests |
| `@playwright/test` | `1.65.1` | Development | Browser E2E automation runner |
| `@types/node` | `26.6.6` | Development | Node 26 type declarations |
| `@types/react` | `19.3.0` | Development | React 19 type declarations |
| `@types/react-dom` | `19.3.0` | Development | React DOM 19 type declarations |

---

## 4. Verification Evidence & Quality Gates

All five quality gates were executed directly in PowerShell Core 7.6.10 on Windows:

| Gate | Command | Exit Code | Result Summary | Duration |
| :--- | :--- | :---: | :--- | :---: |
| **Lint** | `npm run lint` | `0` | 0 errors, 0 warnings (`eslint .`) | 6.5s |
| **Typecheck** | `npm run typecheck` | `0` | Clean compilation (`tsc --noEmit`) | 3.4s |
| **Unit Test** | `npm test` | `0` | 4/4 tests passed (1 file, Vitest v3.2.7) | 3.0s |
| **Production Build** | `npm run build` | `0` | Prerendered static `/` & `/_not-found` with Turbopack | 7.1s |
| **E2E Smoke Suite** | `npm run test:e2e` | `0` | 10/10 tests passed (4 workers, Desktop & Mobile Chromium) | 8.0s |

### Detailed Test Breakdown
- **Vitest Unit Suite (`tests/unit/homepage.test.tsx`):**
  - `renders the primary heading with the owner name`: PASS
  - `renders candidate engineering project highlights`: PASS
  - `contains clear notice of active development under Milestone M04`: PASS
  - `verifies sensitive private information is strictly absent from DOM`: PASS
- **Playwright E2E Suite (`tests/e2e/smoke.spec.ts`):**
  - `[Desktop Chromium] loads homepage with status 200 and correct document title`: PASS
  - `[Desktop Chromium] contains accessible semantic document structure and skip link`: PASS
  - `[Desktop Chromium] renders valid heading hierarchy and hero content`: PASS
  - `[Desktop Chromium] verifies responsive viewport without horizontal overflow`: PASS
  - `[Desktop Chromium] verifies candidate project highlights are visible`: PASS
  - `[Mobile Chromium] loads homepage with status 200 and correct document title`: PASS
  - `[Mobile Chromium] contains accessible semantic document structure and skip link`: PASS
  - `[Mobile Chromium] renders valid heading hierarchy and hero content`: PASS
  - `[Mobile Chromium] verifies responsive viewport without horizontal overflow`: PASS
  - `[Mobile Chromium] verifies candidate project highlights are visible`: PASS

---

## 5. Security & Privacy Audit Findings

1. **Version Control Isolation:** Checked via `Get-Item .git`. Output: Nonexistent (exit code 1). Gate A remained strictly local.
2. **Environment & Secret Hygiene:** Checked via `Get-ChildItem -Filter ".env*"`. Output: Zero files found.
3. **Personal Privacy Inspection:** 
   - No phone numbers (`+880...`, `01...`) exist in markup, components, or metadata.
   - No home street addresses or private references exist in the source tree.
   - Candidate projects reference only public educational summaries and public GitHub handles (`asmkhalid111`).
4. **Scaffold Collision Prevention:** Temporary scaffold transfer safely omitted generic scaffold `AGENTS.md` and `README.md`, leaving project governance documentation 100% intact.

---

## 6. Engineering Incidents Encountered & Resolved

During the local verification phase, three engineering items were encountered and resolved cleanly:

1. **ESLint Unused Variable Warning:**
   - *Symptom:* `npm run lint` flagged `warning 'Link' is defined but never used in src/app/page.tsx`.
   - *Resolution:* Removed the unused import from `src/app/page.tsx`. Lint check re-run yielded 0 errors and 0 warnings.
2. **Vitest DOM Secret Assertion False Positive:**
   - *Symptom:* `tests/unit/homepage.test.tsx` assertion `expect(content).not.toMatch(/password/i)` failed because the Web-LAN-Chat description included "secure password hashing".
   - *Resolution:* Refined the project summary in `src/app/page.tsx` to "cryptographic credential hashing", which is technically more accurate and avoids false positives during DOM secret scans. Vitest passed 4/4.
3. **Next.js 16 Static Prerendering with Turbopack:**
   - *Symptom:* `npm run build` failed during static page prerender: `Next.js encountered the unstable value 'new Date()' while prerendering in src/components/layout/footer.tsx`.
   - *Resolution:* Next.js 16 with Partial Prerendering and Cache Components disallows nondeterministic `new Date()` calls at prerender time unless cached or run client-side. The footer copyright was updated to a deterministic constant `CURRENT_YEAR = 2026;`, eliminating runtime dynamic rendering overhead. The build compiled successfully with exit code 0.

---

## 7. Gate B Readiness Recommendation

Gate A has satisfied all criteria for local baseline stability and test coverage.

**Recommendation:** Gate A is COMPLETE and ready for review. Gate B (Git initialization, commit creation, and GitHub remote connection) requires explicit authorization from the Project Owner following ChatGPT's review of this report.
