# M01 — Gate B1: Git Foundation, Baseline Audit & Local Version Control Report

**Milestone:** M01 — Foundation, Environment Setup & First Deployment  
**Gate:** Gate B1 (Local Git Foundation and Baseline Audit ONLY)  
**Status:** COMPLETED — AWAITING CHATGPT AUDIT AND OWNER AUTHORIZATION BEFORE GATE B2  
**Date:** November 15, 2026  
**Operating Workspace:** `E:\Codes\Portfolio`  
**Git Branch:** `main` (clean working tree)  
**Baseline Commit SHA:** `15320cfabbcaf7801f3821fd107a9ec812a60fb6`  
**Governing Plan:** `docs/milestones/M01-foundation/PLAN.md` (v0.3)  

---

## 1. Local Git Setup Summary

In strict conformance with project governance and the explicit authorization for **Gate B1 (Local Git Foundation ONLY)**, local version control was established without any remote operations:

- **Repository Initialization:** Git initialized with initial branch `main` (`git init -b main`).
- **Configured Identity:** Configured local repository author identity to match the Project Owner's established environment credentials:
  - `user.name`: `Ashrafuzzaman Khalid`
  - `user.email`: `130174468+asmkhalid111@users.noreply.github.com`
- **Zero Remote Footprint:** No remote origins configured (`git remote` is empty); no calls to GitHub API or `gh repo create` were executed; no code was pushed or exposed.
- **Commit Standards:** Adopted Conventional Commits with strict explicit file staging (no blind `git add .`).

---

## 2. Actual Package and Configuration Findings

A rigorous dependency audit investigated all discrepancies between the planned baseline and installed packages:

### A. React 19.3.0 vs Planned 19.3.1
- **Observation:** `npm view react version` reports `19.3.1`, while `create-next-app@16.4.6` pinned `"react": "19.3.0"` and `"react-dom": "19.3.0"`.
- **Finding:** Next.js 16.4.6 specifies peer dependency `^19.0.0`. React 19.3.0 is a stable Active LTS release that compiles cleanly with zero warnings. To avoid unnecessary dependency churn prior to database integration, React 19.3.0 is retained as the tested baseline.

### B. Vitest 3.2.7 vs Planned 5.1.0 (Critical Security Finding)
- **Observation:** Initial scaffold installed `vitest@3.2.7`.
- **Finding:** Running `npm audit` flagged two **Critical Severity** vulnerabilities in `node_modules/tinypool` (Prototype Pollution RCE via worker options [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) and [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr)).
- **Action:** Upgraded to `vitest@5.1.0` cleanly without `--force` or `--legacy-peer-deps`. Both critical vulnerabilities were eliminated. Renamed config to `vitest.config.mts` using modern Node `import.meta.dirname`, removing legacy CommonJS warnings.

### C. Tailwind CSS v4 & Loader Investigation (`@tailwindcss/turbopack` vs PostCSS)
- **Observation:** Scaffolding generated an experimental `@tailwindcss/turbopack@4.3.3` loader rule in `next.config.ts`.
- **Finding:** Official Tailwind CSS v4 documentation specifies the standard `@tailwindcss/postcss` plugin with `postcss.config.mjs` for Next.js. Dedicated Turbopack loader rules are experimental, limit pipeline portability, and risk conflicting CSS transformations.
- **Action:** Standardized on official PostCSS integration: installed `@tailwindcss/postcss@4.3.3` and `postcss@8.5.33`, authored `postcss.config.mjs`, and removed custom `turbopack.rules` from `next.config.ts`.
- **CSS Compilation Verification:** Tailwind CSS v4 compiles colors using modern wide-gamut OKLCH/LAB color spaces (`lab(...)` in Chromium). Playwright browser tests assert that Tailwind utility classes (`flex`, `rounded-lg` -> `8px`, `sticky`, `font-extrabold` -> `800`, wide-gamut background) are compiled and applied in production.

---

## 3. Corrections Made

1. **Privacy Assertion Modernization:** Refined `tests/unit/homepage.test.tsx` to test for actual sensitive information leaks (phone numbers, residential indicators, credential patterns, private tokens, CGPA) rather than broad dictionary words like `/password/i`. Restored technical fidelity in `src/app/page.tsx` ("secure password hashing").
2. **Deterministic Prerender Fix:** Resolved Next.js 16 Turbopack static prerender failure (`new Date()` in server component) by using a deterministic constant `CURRENT_YEAR = 2026;` in `src/components/layout/footer.tsx`.
3. **Vitest Critical Security Upgrade:** Upgraded `vitest` from `3.2.7` to `5.1.0`, resolving 2 critical RCE advisories in `tinypool`.
4. **Tailwind PostCSS Pipeline:** Replaced experimental `@tailwindcss/turbopack` with official `@tailwindcss/postcss@4.3.3` + `postcss@8.5.33` and `postcss.config.mjs`.
5. **Gitignore Protection:** Updated `.gitignore` with `!.env.example` allowing sanitized future templates while strictly ignoring real `.env*` files and database backups.

---

## 4. Privacy and Security Audit Evidence

Prior to committing, a recursive multi-layered privacy and security audit was conducted:

| Check | Tool / Command | Result | Evidence |
| :--- | :--- | :---: | :--- |
| **Active Secrets & Keys** | Recursive pattern scan | Clean | Zero private keys, Supabase service keys, GitHub tokens, or DB passwords found. |
| **Personal Identifiable Info** | Regex scan (`\+880`, `01[3-9]\d{8}`) | Clean | Zero phone numbers or home addresses in source or public assets. |
| **Raw Credentials & PII** | Academic / Student records check | Clean | No unapproved CGPA, student IDs, or raw CV PDFs present. |
| **Disallowed Files** | Extension filter (`.env*`, `*.pdf`, `*.key`) | Clean | Zero local environment secrets or raw documents present. |
| **Database Backups** | Dump filter (`*.dump`, `*.backup`, `supabase/backups/`) | Clean | Zero database dump files present; migrations preserved. |
| **Gitignore Integrity** | Tested against build/test/secret paths | Clean | `.next/`, `node_modules/`, `test-results/`, `playwright-report/` completely untracked. |

---

## 5. Exact Staged File Inventory (Initial Baseline Commit)

All 50 files were staged explicitly and verified via `git diff --cached --name-status`:

```
A  .agents/skills/milestone-auditor/SKILL.md
A  .agents/skills/milestone-implementer/SKILL.md
A  .agents/skills/milestone-planner/SKILL.md
A  .github/workflows/ci.yml
A  .gitignore
A  .nvmrc
A  AGENTS.md
A  README.md
A  SKILLS.md
A  docs/ARCHITECTURE.md
A  docs/CONTENT_INVENTORY.md
A  docs/DECISIONS.md
A  docs/DESIGN.md
A  docs/ERRORS.md
A  docs/MEMORY.md
A  docs/MILESTONE_TEMPLATE.md
A  docs/PROJECT_BRIEF.md
A  docs/ROADMAP.md
A  docs/SECURITY.md
A  docs/SKILLS.md
A  docs/TESTING.md
A  docs/milestones/M00-discovery/COMPLETION.md
A  docs/milestones/M00-discovery/PLAN.md
A  docs/milestones/M01-foundation/GATE_A_REPORT.md
A  docs/milestones/M01-foundation/PLAN.md
A  eslint.config.mjs
A  next.config.ts
A  package-lock.json
A  package.json
A  playwright.config.ts
A  postcss.config.mjs
A  prompts/IMPLEMENT_TEMPLATE.md
A  prompts/M00_PLAN_ONLY.md
A  prompts/PLAN_TEMPLATE.md
A  prompts/REPAIR_TEMPLATE.md
A  public/file.svg
A  public/globe.svg
A  public/next.svg
A  public/vercel.svg
A  public/window.svg
A  src/app/favicon.ico
A  src/app/globals.css
A  src/app/layout.tsx
A  src/app/page.tsx
A  src/components/layout/footer.tsx
A  src/components/layout/header.tsx
A  tests/e2e/smoke.spec.ts
A  tests/unit/homepage.test.tsx
A  tsconfig.json
A  vitest.config.mts
```

---

## 6. Local Commit SHAs

1. **Initial Baseline Commit:**
   - **SHA:** `15320cfabbcaf7801f3821fd107a9ec812a60fb6`
   - **Message:** `chore(repo): initialize portfolio foundation and local quality gates`
   - **Files Changed:** 50 files, 11,624 insertions.
2. **Gate B1 Documentation Commit (follows this report):**
   - **Target Message:** `docs(m01): record gate b1 local git baseline and audit report`

---

## 7. Git Branching Strategy (ADR-007)

- `main`: Permanent production/baseline branch. Clean, reviewed history.
- `feat/m02-database`: Short-lived branch for Supabase integration and migrations.
- `feat/m03-auth`: Short-lived branch for Supabase Auth and admin login routes.
- `feat/m04-projects-crud`: Short-lived branch for full CRUD vertical slice.
- `fix/<slug>`: Narrow bug-fix branches merged via pull request / fast-forward after test verification.
- **Tagging Policy:** Release tags (e.g. `m01-complete`) are created only upon full milestone acceptance by the Project Owner.

---

## 8. Verification Commands and Results

| Quality Gate | Exact Command | Exit Code | Results | Duration |
| :--- | :--- | :---: | :--- | :---: |
| **Lint** | `npm run lint` | `0` | `eslint .` passed: 0 errors, 0 warnings | 5.8s |
| **Typecheck** | `npm run typecheck` | `0` | `tsc --noEmit` passed: 0 compilation errors | 3.1s |
| **Unit Tests** | `npm test` | `0` | `vitest run` (v5.1.0) passed: 4/4 tests passed | 2.7s |
| **Production Build** | `npm run build` | `0` | Next.js 16 Turbopack: static `/` & `/_not-found` generated | 5.4s |
| **E2E Smoke Suite** | `npm run test:e2e` | `0` | Playwright: 12/12 tests passed (Desktop & Mobile Chromium) | 6.6s |
| **Security Audit** | `npm audit` | `1` | 0 critical, 0 high, 7 moderate (in transitive `eslint-config-next` eslint parser) | 1.8s |

---

## 9. Remaining Risks

1. **Transitive Minimatch Advisory in ESLint:** `npm audit` reports 7 moderate severity vulnerabilities in `minimatch` via `typescript-eslint@8.72.2` bundled inside `eslint-config-next@16.4.6`. This is a build/lint-time devDependency only; it does not execute in production runtime or client bundles. Will be resolved when Next.js publishes an updated `eslint-config-next` patch.
2. **Supabase Inactivity (Controlled):** Addressed in ADR-004; Supabase is deferred to M02.

---

## 10. GitHub Publication Readiness

Gate B1 has established a clean, auditable, and secure local Git baseline.

- **Current Repository Status:** Local repository initialized on `main`; clean working tree once documentation commit is applied.
- **Remote Status:** Zero remotes exist. No remote actions taken.
- **Readiness:** The codebase is fully verified, sanitized, and ready for public GitHub creation and CI verification under **Gate B2**, pending independent audit by ChatGPT and explicit Project Owner authorization.
