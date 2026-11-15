# M01 — Implementation Plan: Foundation, Environment Setup & First Deployment

> **Milestone ID:** M01-foundation  
> **Status:** GATE B2A COMPLETED (Gate B2 Remote Publication & Gate C Unauthorized)  
> **Date:** 2026-11-15  
> **Author:** Antigravity (Implementation Engineer & Documentation Maintainer)  
> **Review Workflow:** Antigravity (Plan Author) → ChatGPT (Architecture & Acceptance Reviewer) → Project Owner (Final Authority & Approver)  
> **Operating Mode:** LOCAL GIT HISTORY SANITIZATION COMPLETE (Remote GitHub and Vercel strictly prohibited)

---

## Document Revision History

| Version | Date | Author | Summary of Changes |
|---|---|---|---|
| v0.1 | 2026-11-15 | Antigravity | Initial M01 implementation plan covering isolated temporary-directory scaffolding, Next.js 16 Active LTS baseline, strict TypeScript, Tailwind CSS v4, minimal accessible homepage, testing harness (Vitest, Playwright), CI/CD workflow, three-gate deployment procedure, pre-publication privacy scan, and rollback strategy. |
| v0.2 | 2026-11-15 | Antigravity | Incorporated mandatory ChatGPT architecture corrections: updated Next.js 16 linting command to `eslint .` (as `next lint` is removed in Next.js 16); ensured complete scaffold manifest transfer including generated `package.json` and build configs; redesigned pre-publication secrets/privacy audit to be recursive, Git-aware, and multi-layered; replaced blanket rollback deletion with non-destructive checkpoint recovery; revalidated dependency versions (`next@16.4.6`, `react@19.3.1`, `typescript@5.8.2`, `vitest@5.1.0`); recorded Project Owner authorization for Gate A implementation only (Gate B & C remain unauthorized). |
| v0.3 | 2026-11-15 | Antigravity | Reconciled package dependency findings: migrated Vitest to `5.1.0` to resolve critical `tinypool` prototype pollution advisory GHSA-5gmw-xhrv-c9v3; standardized Tailwind CSS v4 on official `@tailwindcss/postcss@4.3.3` + `postcss@8.5.33` with `postcss.config.mjs` and removed experimental `@tailwindcss/turbopack` loader rules; added browser-level computed CSS assertions in Playwright verifying wide-gamut color and geometric layout compilation; separated Gate B into Gate B1 (Local Git Foundation & Baseline Audit — COMPLETED) and Gate B2 (Remote GitHub Creation & CI — UNAUTHORIZED). |
| v0.4 | 2026-11-15 | Antigravity | Gate B2A Git Email Privacy Correction: verified Project Owner's official GitHub noreply address (`130174468+asmkhalid111@users.noreply.github.com`) via GitHub CLI and verified historical commits; created local recovery checkpoint; sanitized commit author/committer metadata and historical tracked documentation; purged unreferenced Next.js default sample SVGs; verified zero occurrences of personal email across all historical commits and trees. Remote publication remains unauthorized. |

---

## 1. Executive Summary & Objective

The objective of Milestone 01 (**M01**) is to establish a solid, clean, and verifiable application foundation for the personal portfolio. This includes scaffolding the Next.js 16 application into the existing workspace without clobbering governance documentation, configuring strict type safety and modern Tailwind v4 styling, setting up unit and browser-testing harnesses, establishing continuous integration, and deploying the initial application shell to Vercel on the Hobby tier.

### Strategic Scope Boundary
M01 delivers an accessible, deployed, and testable foundation — **not the completed portfolio**.
- **Included in M01:** Non-destructive Next.js 16 scaffold, strict TypeScript configuration, Tailwind v4 styling tokens, semantic accessible homepage shell, unit and browser test harness, GitHub Actions CI, pre-publication privacy audit, and live Vercel deployment of the foundation shell.
- **Strictly Deferred to Later Milestones:**
  - Supabase client integration, PostgreSQL schemas, and database migrations are deferred to **M02**.
  - Administrator authentication and login routes are deferred to **M03**.
  - Projects CRUD vertical slice and admin dashboard are deferred to **M04**.
  - Bespoke editorial design system and visual polish are deferred to **M05**.

---

## 2. Scope & Explicit Non-Goals

### 2.1 In-Scope for M01 Implementation
1. **Isolated Non-Destructive Scaffolding:** Scaffold Next.js 16 in a temporary directory (`temp-scaffold`) using `--disable-git` and `--skip-install`, audit file collisions against existing governance files, transfer runtime and build-critical files (including generated application manifest `package.json`), merge `.gitignore` rules, and remove temporary artifacts.
2. **Framework & Styling Configuration:** Configure Next.js 16.4.6 with React 19, strict TypeScript (`tsconfig.json`), and Tailwind CSS v4 using modern `@theme` design tokens.
3. **Application Structure & Homepage Shell:** Build a semantic, accessible foundation layout (`header`, `main`, `footer`), root metadata, and an authentic introductory homepage displaying approved candidate facts without exposing private details.
4. **Testing Infrastructure:** Install and configure Vitest (`5.1.0`) with React Testing Library (`16.3.3`) for component testing, and Playwright (`1.65.1`) for browser-driven smoke and responsive testing.
5. **Continuous Integration:** Establish `.github/workflows/ci.yml` to run linting (`eslint .`), typechecking, unit tests, Playwright tests, and production build on pull requests and pushes to `main`.
6. **Execution Gates:** Strictly segregate execution into Gate A (Local Foundation), Gate B (Git & GitHub Repo Creation), and Gate C (Vercel Production Deployment).
7. **Pre-Publication Audit:** Execute an automated privacy and secrets audit across all tracked workspace files before making the repository public.

### 2.2 Explicit Non-Goals for M01
- **No Supabase Provisioning or Library Installation:** `@supabase/supabase-js` and `@supabase/ssr` are deferred to M02. Zero database credentials or secrets will be configured in M01.
- **No Authentication or Admin Pages:** `/admin` and `/admin/login` routes will not be scaffolded in M01.
- **No Complex Design Systems or Animations:** No heavy animation libraries (Framer Motion), 3D canvas libraries, or synthetic visual tropes. Bespoke design is scheduled for M05.
- **No Premature Architecture:** No premature microservices, ORMs, or unused directory structures for future milestones (M02–M10).

---

## 3. Verified Environment Inventory

Observed and verified via local environment audit:
- **Operating System:** Microsoft Windows 11 Pro / Enterprise (OS Build `10.0.26200`, `Win32NT`).
- **Command Shell:** PowerShell Core `7.6.10` (`pwsh`), 64-bit edition.
- **Node.js Runtime:** `v26.7.0` (Satisfies `>=20.9.0` Next.js requirement; supported on Vercel since October 29, 2026).
- **Package Manager:** `npm 11.19.0` (Installed and native on Windows; generates deterministic `package-lock.json`).
- **Version Control:** `git version 2.55.0.windows.3` (Installed; workspace is currently not initialized as a git repo).
- **Developer CLIs:** `gh.exe` (GitHub CLI present and authenticated to `asmkhalid111` with `repo`, `workflow`, `gist` scopes); `npx.ps1` present.
- **Global Antigravity Skills:** `modern-web-guidance` plugin active.

---

## 4. Dependency Compatibility Matrix & Version Baseline

All package versions were audited directly against the npm registry on November 15, 2026, to verify stable patched releases, peer dependency compatibility, and Node 26 compatibility (zero canary builds; no `--force` or `--legacy-peer-deps` permitted):

| Package | Resolved Version | Peer Dependencies & Compatibility Notes |
|---|---|---|
| `next` | `16.4.6` | Active LTS baseline. Requires `node: '>=20.9.0'`. Peers with `react@^19.0.0`. |
| `react` | `19.3.1` | React core library. Compatible with Next.js 16 Server Components. |
| `react-dom` | `19.3.1` | React DOM renderer. Matches `react@19.3.1`. |
| `typescript` | `5.8.2` | TypeScript compiler. Strict mode enabled (`noImplicitAny`, `strictNullChecks`). |
| `@types/react` | `19.3.0` | Type definitions for React 19. |
| `@types/react-dom` | `19.3.0` | Type definitions for React DOM 19. |
| `@types/node` | `26.6.6` | Type definitions for Node.js 26 runtime. |
| `tailwindcss` | `4.3.5` | Utility CSS v4. Configured via `@theme` tokens in `src/app/globals.css`. |
| `@tailwindcss/postcss` | `4.3.5` | Official PostCSS plugin for Tailwind v4. |
| `postcss` | `8.5.3` | PostCSS runner. |
| `eslint` | `10.15.0` | Modern flat-config ESLint runner. |
| `eslint-config-next` | `16.4.6` | Next.js standard lint rules matching `next@16.4.6`. |
| `lucide-react` | `0.475.0` | Lightweight tree-shakeable accessible SVG icons. |
| `vitest` (dev) | `5.1.0` | Native ESM test runner. Compatible with Node 26 and React 19. |
| `@testing-library/react` (dev) | `16.3.3` | React component testing utilities. Peers with `react@^19.0.0`. |
| `@testing-library/dom` (dev) | `10.4.0` | DOM query utilities for Testing Library. |
| `jsdom` (dev) | `26.0.0` | Headless browser DOM environment for Vitest. |
| `@playwright/test` (dev) | `1.65.1` | Browser E2E automation for desktop and mobile viewports. |

### Node 26 Runtime Pinning Across Environments
1. **Local:** Create root `.nvmrc` containing `26`.
2. **Package Manifest:** Add to `package.json`:
   ```json
   "engines": {
     "node": "^26.0.0",
     "npm": ">=11.0.0"
   }
   ```
3. **GitHub Actions CI:** Pinned to Node 26 via `actions/setup-node@v4` with `node-version: 26`.
4. **Vercel Production:** Configured in Vercel Project Settings $\rightarrow$ General $\rightarrow$ Node.js Version: `26.x`.

---

## 5. Non-Destructive Scaffolding Plan

The workspace `E:\Codes\Portfolio` already contains essential governance files (`AGENTS.md`, `README.md`, `SKILLS.md`, `.agents/`, `docs/`, `prompts/`). Running `create-next-app` directly in this folder would fail or overwrite existing files.

### 5.1 Scaffolding Procedure
```
Step 1: Scaffold in Isolated Directory
  npx create-next-app@16.4.6 temp-scaffold --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --skip-install --disable-git

Step 2: Inventory & Diff Before Copy
  - Run Get-ChildItem -Recurse temp-scaffold and record all generated files.
  - Compare generated files against E:\Codes\Portfolio.
  - Confirm collision protection for existing governance files.

Step 3: Transfer Application & Build Assets
  - Transfer: src/, next.config.ts, tsconfig.json, postcss.config.mjs, eslint.config.mjs, next-env.d.ts, public/, package.json
  - Merge: .gitignore entries into existing .gitignore without deleting workspace rules.

Step 4: Cleanup & Local Verification
  - Confirm all required files exist in workspace root.
  - Remove-Item -Recurse -Force temp-scaffold (only after safe transfer verified).
  - npm install in workspace root (generates package-lock.json).
  - Verify clean local build and test execution.
```

### 5.2 Collision Protection Matrix

| File / Folder in `temp-scaffold` | Target Location in Root | Action | Preservation Rule |
|---|---|---|---|
| `README.md` | `README.md` | **DO NOT OVERWRITE** | Keep existing project `README.md`. Discard generated Next.js generic readme. |
| `.gitignore` | `.gitignore` | **MERGE** | Append Next.js rules (`.next/`, `node_modules/`, `*.tsbuildinfo`, `.vercel`) to existing `.gitignore`. Ensure `supabase/backups/` and `.env*.local` remain ignored. |
| `src/` | `src/` | **TRANSFER & CUSTOMIZE** | Move generated `src/` directory. Replace default boilerplates with our semantic layout and homepage. |
| `package.json` | `package.json` | **TRANSFER & MERGE** | Move generated application manifest, incorporating exact pinned dependencies and required npm validation scripts. |
| `tsconfig.json` | `tsconfig.json` | **TRANSFER & HARDEN** | Move generated `tsconfig.json` and verify strict mode (`strict: true`, `noImplicitAny: true`, `@/*` alias). |
| `next.config.ts` | `next.config.ts` | **TRANSFER** | Move base Next.js configuration. |
| `postcss.config.mjs` | `postcss.config.mjs` | **TRANSFER** | Move Tailwind v4 PostCSS configuration. |
| `eslint.config.mjs` | `eslint.config.mjs` | **TRANSFER & CONFIGURE** | Move Next.js ESLint flat configuration, configured for Next.js 16 and TypeScript. |
| `public/` | `public/` | **TRANSFER** | Transfer static public asset directory. |
| `AGENTS.md`, `docs/`, `prompts/`, `.agents/` | Root directories | **IMMUTABLE** | Scaffolding script has zero access to these directories. |

---

## 6. Initial Application Scope & Semantic Homepage

### 6.1 Architectural Layout (`src/app/layout.tsx`)
- Standard semantic HTML5 document: `<!DOCTYPE html><html lang="en">`.
- Configured font: System sans-serif font stack with high legibility (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- Semantic structure: `<Header />`, `<main id="main-content">`, `<Footer />`.
- Skip-to-content accessibility link (`<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to main content</a>`).
- Viewport metadata configured for mobile responsiveness (`width=device-width, initial-scale=1`).

### 6.2 Foundation Homepage (`src/app/page.tsx`)
The M01 homepage serves as an honest, professional engineering foundation:
- **Hero Section:**
  - Semantic `<h1>`: "Ashrafuzzaman Khalid"
  - Subtitle: "Computer Science & Engineering Student · Software Engineer"
  - Short summary: Highlighting core areas of work (compilers, distributed chat engines, machine learning research, browser tooling) grounded strictly in approved candidate items from `docs/CONTENT_INVENTORY.md`.
- **Engineering Highlights (Foundation Preview):**
  - Highlighting candidate project titles (Web-LAN-Chat, BanglaScript Compiler, Clean Later, Brain Tumor ML Research) with brief technical descriptions.
  - Clear notice: *Full interactive case studies and academic CRUD dashboard currently in active development under Milestone M04.*
- **Professional Links:**
  - GitHub profile: `https://github.com/asmkhalid111` (external link with `rel="noopener noreferrer"`).
  - LinkedIn profile: Verified link from content inventory.
- **Header & Navigation:**
  - Brand name linking to `/`.
  - Simple nav links: "About", "Projects" (smooth anchor or placeholder route), and "GitHub".
- **Footer:**
  - Semantic `<footer>` with copyright year, "Built with Next.js 16 & TypeScript", and current milestone status indicator.

### 6.3 Design Tokens (`src/app/globals.css`)
Tailwind CSS v4 `@theme` configuration:
```css
@import "tailwindcss";

@theme {
  --color-canvas: #fafafa;
  --color-surface: #ffffff;
  --color-border: #e5e7eb;
  --color-text-primary: #111827;
  --color-text-secondary: #4b5563;
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

:root {
  color-scheme: light;
}

body {
  background-color: var(--color-canvas);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
}
```

---

## 7. Testing Strategy & Continuous Integration

### 7.1 Validation Scripts in `package.json`
> [!IMPORTANT]
> Next.js 16 removed the `next lint` command. Linting must invoke `eslint .` directly.

```json
{
  "name": "portfolio",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": "^26.0.0",
    "npm": ">=11.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

### 7.2 Unit & Integration Testing (Vitest)
Configuration: `vitest.config.ts`
- Environment: `jsdom`
- Test match: `tests/unit/**/*.test.{ts,tsx}`
- Path alias: `@/*` mapped to `./src/*`

**M01 Unit Test (`tests/unit/homepage.test.tsx`):**
- Asserts that the homepage renders without crashing.
- Verifies that `<h1>` contains the owner's name ("Ashrafuzzaman Khalid").
- Verifies that navigation links and candidate project sections render.
- Asserts that private contact information (phone, address) is **absent** from the rendered DOM.

### 7.3 End-to-End Testing (Playwright)
Configuration: `playwright.config.ts`
- Web server integration: Automatically starts `npm run start` (or `next dev`) on port 3000 during test execution.
- Projects: Chromium (desktop 1280x720) and Mobile Chrome (Pixel 5 / viewport 375x667).

**M01 E2E Smoke Tests (`tests/e2e/smoke.spec.ts`):**
1. **HTTP 200 & Title Check:** Navigates to `/`, verifies status 200, checks page title matches `Ashrafuzzaman Khalid — Software Engineering Portfolio`.
2. **Semantic Elements:** Verifies `<header>`, `<main id="main-content">`, and `<footer>` exist and are visible.
3. **Responsive Viewport:** Tests layout rendering at desktop (1280px) and mobile (375px) ensuring no horizontal overflow (`scrollWidth <= clientWidth`).
4. **Accessibility Baseline:** Verifies `html[lang="en"]`, document title, proper heading hierarchy (`h1` $\rightarrow$ `h2`), and focusability of the skip link.

### 7.4 GitHub Actions CI Pipeline (`.github/workflows/ci.yml`)
Runs on every push to `main` and on pull requests:
```yaml
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    name: Lint, Typecheck, Test & Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js 26
        uses: actions/setup-node@v4
        with:
          node-version: 26
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Code Linting
        run: npm run lint

      - name: TypeScript Typecheck
        run: npm run typecheck

      - name: Unit Tests
        run: npm test

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Production Build
        run: npm run build

      - name: End-to-End Smoke Tests
        run: npm run test:e2e
```

---

## 8. Implementation & Deployment Approval Gates

To protect external accounts and enforce owner sovereignty, M01 is strictly divided into three sequential gates:

```
┌────────────────────────────────────────────────────────────────────────┐
│ GATE A: Local Foundation & Verification (COMPLETED & ACCEPTED)         │
│ - Scaffold Next.js in temp folder, diff-before-copy, transfer assets   │
│ - Implement semantic layout, homepage, design tokens, and tests        │
│ - Execute local checks: typecheck, lint, vitest, build, playwright     │
│ └── PASS CONDITION: All 5 local verification commands exit with code 0 │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GATE B1: Local Git Baseline & Audit (COMPLETED & RECORDED)             │
│ - Multi-layer pre-commit privacy and secret audit across all files     │
│ - Initialize local Git on main: git init -b main                       │
│ - Configure local author identity: Ashrafuzzaman Khalid                │
│ - Conventional commit baseline: chore(repo): initialize foundation     │
│ - Reconcile dependencies: Vitest 5.1.0, Tailwind PostCSS pipeline      │
│ └── PASS CONDITION: Clean working tree, all tests pass, local SHA      │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼ [STOP: Requires Owner Gate B2 Approval]
┌────────────────────────────────────────────────────────────────────────┐
│ GATE B2: GitHub Remote & CI (UNAUTHORIZED — Awaiting Review & Owner)   │
│ - Create public GitHub repository via gh CLI: asmkhalid111/portfolio   │
│ - Authenticate remote origin: origin = git@github.com:...              │
│ - Push main branch to remote                                           │
│ - Trigger and monitor GitHub Actions CI pipeline on Node 26            │
│ └── PASS CONDITION: Remote repo created, CI workflow green on main     │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼ [STOP: Requires Owner Gate C Approval]
┌────────────────────────────────────────────────────────────────────────┐
│ GATE C: Hosting & First Live Deployment (UNAUTHORIZED — Pending B2)    │
│ - Link repository to Vercel Hobby project (Node.js 26.x runtime)       │
│ - Zero environment secrets required in M01                             │
│ - Trigger initial production deployment                                │
│ - Verify live public URL: https://<project>.vercel.app returns 200     │
│ └── PASS CONDITION: Live URL accessible, SSL valid, smoke test passes  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Pre-Publication Privacy & Secrets Audit Procedure

Before executing Gate B (`git add` and `gh repo create`), a multi-layered audit procedure will execute across all tracked files:

1. **Recursive Text & Config File Discovery:** Recursively discover all `.md`, `.ts`, `.tsx`, `.js`, `.mjs`, `.json`, `.yml`, `.css` files in the workspace (excluding `node_modules/`, `.next/`, and temporary build directories).
2. **Secrets & Tokens Pattern Detection:** Scan for sensitive signatures:
   - Supabase service role keys (`SUPABASE_SERVICE_ROLE_KEY`, `eyJhbGciOi...`).
   - GitHub tokens (`ghp_`, `gho_`, `github_pat_`).
   - Private key blocks (`BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`).
   - Database connection strings (`postgresql://`, `postgres://`).
3. **Personal Identifiable Information (PII) Checks:** Scan for:
   - Private phone numbers (`\+880\d+`, `01[3-9]\d{8}`).
   - Residential street addresses and unapproved personal email addresses.
4. **Binary & Asset Validation:** Inspect `public/` directory ensuring only lightweight approved SVGs/favicons exist. Confirm no raw `.pdf`, `.docx`, or scanned credential files are present.
5. **Git-Aware Review (Gate B):** Once Git is initialized in Gate B, run `git diff --cached --stat` and verify the exact staged file list before running `git commit`.

---

## 10. Proposed M01 File Tree

```
E:\Codes\Portfolio\
├── .agents/skills/                           # [Preserved] Native Antigravity workflow skills
│   ├── milestone-auditor/SKILL.md
│   ├── milestone-implementer/SKILL.md
│   └── milestone-planner/SKILL.md
├── .github/
│   └── workflows/
│       └── ci.yml                            # [New] GitHub Actions CI pipeline
├── docs/                                     # [Preserved] Complete project governance architecture
│   ├── milestones/
│   │   ├── M00-discovery/
│   │   │   ├── PLAN.md
│   │   │   └── COMPLETION.md
│   │   └── M01-foundation/
│   │       ├── PLAN.md                       # [This file - v0.2]
│   │       ├── GATE_A_REPORT.md              # [New - Gate A outcome]
│   │       └── COMPLETION.md                 # [Deferred - After Gate C]
│   ├── ARCHITECTURE.md
│   ├── CONTENT_INVENTORY.md
│   ├── DECISIONS.md
│   ├── DESIGN.md
│   ├── ERRORS.md
│   ├── MEMORY.md
│   ├── MILESTONE_TEMPLATE.md
│   ├── PROJECT_BRIEF.md
│   ├── ROADMAP.md
│   ├── SECURITY.md
│   ├── SKILLS.md
│   └── TESTING.md
├── prompts/                                  # [Preserved] Reusable workflow prompts
├── public/                                   # [New] Static assets (favicon, icons)
│   └── favicon.ico
├── src/                                      # [New] Application source tree
│   ├── app/
│   │   ├── layout.tsx                        # [New] Root layout with skip-link & fonts
│   │   ├── page.tsx                          # [New] Accessible foundation homepage
│   │   └── globals.css                       # [New] Tailwind v4 @theme design tokens
│   └── components/
│       └── layout/
│           ├── header.tsx                    # [New] Accessible header with branding & semantic nav
│           └── footer.tsx                    # [New] Accessible footer with metadata & status indicator
├── tests/                                    # [New] Automated test harness
│   ├── unit/
│   │   └── homepage.test.tsx                 # [New] Vitest component render & privacy assertion test
│   └── e2e/
│       └── smoke.spec.ts                     # [New] Playwright desktop, mobile & a11y smoke tests
├── .gitignore                                # [New/Merged] Merged Next.js, Node, and secret ignore rules
├── .nvmrc                                    # [New] Pinned to Node 26
├── AGENTS.md                                 # [Preserved] Central agent contract
├── eslint.config.mjs                         # [New] Next.js 16 flat ESLint configuration
├── next.config.ts                            # [New] Next.js configuration
├── package.json                              # [New] Manifest with exact pinned dependencies & scripts
├── playwright.config.ts                      # [New] Playwright test configuration with web server
├── postcss.config.mjs                        # [New] PostCSS config for Tailwind v4
├── README.md                                 # [Preserved] Existing project documentation
├── SKILLS.md                                 # [Preserved] Human-readable skills registry
├── tsconfig.json                             # [New] TypeScript strict mode configuration
└── vitest.config.ts                          # [New] Vitest test configuration with jsdom & path aliases
```

---

## 11. Concrete Implementation Sequence & Checkpoints

### 11.1 Checkpoint 1: Non-Destructive Scaffolding
1. Scaffold in isolated directory:
   ```powershell
   npx create-next-app@16.4.6 temp-scaffold --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --skip-install --disable-git
   ```
2. Inventory generated assets vs root files.
3. Move `temp-scaffold/src`, `temp-scaffold/public`, `temp-scaffold/next.config.ts`, `temp-scaffold/postcss.config.mjs`, `temp-scaffold/eslint.config.mjs`, `temp-scaffold/tsconfig.json`, `temp-scaffold/package.json` into workspace root.
4. Merge `.gitignore` rules (preserving `supabase/backups/`, `.env*.local`).
5. Remove `temp-scaffold` only after transfer verification.
6. Set `.nvmrc` to `26`.

### 11.2 Checkpoint 2: Dependency Installation
Install verified stable dependencies using standard npm (creating `package-lock.json`):
```powershell
# Dependencies
npm install next@16.4.6 react@19.3.1 react-dom@19.3.1 tailwindcss@4.3.5 @tailwindcss/postcss@4.3.5 postcss@8.5.3 lucide-react@0.475.0

# Dev Dependencies
npm install -D typescript@5.8.2 @types/react@19.3.0 @types/react-dom@19.3.0 @types/node@26.6.6 eslint@10.15.0 eslint-config-next@16.4.6 vitest@5.1.0 @testing-library/react@16.3.3 @testing-library/dom@10.4.0 jsdom@26.0.0 @playwright/test@1.65.1

# Playwright browser binaries
npx playwright install --with-deps chromium
```

### 11.3 Checkpoint 3: Application Code & Test Setup
- Write `src/app/globals.css` with Tailwind v4 `@theme` tokens.
- Write `src/components/layout/header.tsx` and `footer.tsx`.
- Write `src/app/layout.tsx` (skip link, metadata, semantic structure).
- Write `src/app/page.tsx` (hero, candidate highlights, external links).
- Write `vitest.config.ts` and `tests/unit/homepage.test.tsx`.
- Write `playwright.config.ts` and `tests/e2e/smoke.spec.ts`.
- Write `.github/workflows/ci.yml`.

### 11.4 Checkpoint 4: Gate A Local Verification
Execute all local validation commands:
```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

---

## 12. Risks, Mitigations & Reversible Recovery Strategy

| Risk ID | Risk Description | Severity | Likelihood | Mitigation Strategy |
|---|---|---|---|---|
| **R06** | Collision with existing governance files during scaffold. | High | Medium | Scaffold in isolated `temp-scaffold` directory; inventory and diff before moving; never overwrite `README.md`, `AGENTS.md`, or `docs/`. |
| **R07** | Dependency incompatibilities with Node 26. | High | Low | Query npm registry for exact peer compatibility; pin resolved versions; test build in Node 26 locally before pushing. |
| **R03** | Committing private PII or credentials in initial commit. | Critical | Low | Execute automated pre-publication scan script across all files before running `git add .`. |
| **R11** | Vercel build failure due to Node runtime mismatch. | Medium | Low | Explicitly set Vercel project Node.js version to `26.x` and add `engines` field in `package.json`. |
| **R13** | Playwright test flakiness during CI runs. | Medium | Low | Use headless Chromium only in CI; configure `webServer` block in `playwright.config.ts` with explicit `reuseExistingServer: !process.env.CI`. |

### Reversible Recovery Strategy
- **Targeted Checkpoint Recovery:** Never run blanket deletion commands (`Remove-Item -Recurse -Force src, public, node_modules...`) or hard Git resets.
- If a scaffolding step fails or creates conflicting assets, inspect the inventory of transferred files (`temp-scaffold` vs root) and selectively remove only the specific offending generated file.
- Governance directories (`docs/`, `prompts/`, `.agents/`) and existing root markdown files are tracked in a baseline inventory before transfer begins.

---

## 13. Acceptance Checklist for M01

### Gate A (Local Foundation — Authorized)
- [ ] Next.js 16.4.6 scaffolded non-destructively; no governance files (`AGENTS.md`, `README.md`, `docs/`, `prompts/`) overwritten or deleted.
- [ ] Dependencies installed with committed `package-lock.json`; zero canary packages; no `--force` or `--legacy-peer-deps`.
- [ ] Strict type safety: `npm run typecheck` exits with code 0 under strict TypeScript configuration.
- [ ] Clean linting: `npm run lint` (`eslint .`) exits with code 0 with zero warnings or errors.
- [ ] Unit tests passing: `npm test` (Vitest) executes and passes all component tests.
- [ ] Production build success: `npm run build` generates optimized production bundle with zero compilation errors.
- [ ] Browser smoke tests passing: `npm run test:e2e` (Playwright) passes desktop, mobile viewport, and accessibility baseline checks.
- [ ] `docs/milestones/M01-foundation/GATE_A_REPORT.md` authored and read back from disk.

### Gate B (Git & Remote Repo — Unauthorized)
- [ ] Automated pre-publication scan verifies no private phone numbers, residential addresses, CV PDFs, or secrets exist in any tracked file.
- [ ] Local Git repository initialized cleanly on `main` branch with descriptive initial commit.
- [ ] Public GitHub repository `asmkhalid111/portfolio` created via `gh` CLI and pushed.
- [ ] GitHub Actions CI workflow runs on GitHub and reports green status across all jobs.

### Gate C (Hosting Deployment — Unauthorized)
- [ ] Minimal application shell deployed to Vercel Hobby tier; public URL accessible over HTTPS with valid SSL.
- [ ] Production smoke test passes against live Vercel URL.
- [ ] `docs/milestones/M01-foundation/COMPLETION.md` created with actual executed commands, outputs, commit SHA, and deployment URL.

---

## 14. Decisions Requiring Project Owner Approval

The following items are explicit decision gates requiring **Project Owner** authorization before execution:

- [x] **1. Authorization for Gate A Implementation:** Authorized by project owner in M01 Gate A directive.
- [ ] **2. Authorization for Gate B (Git & GitHub):** Authorize initializing Git, creating the public GitHub repository `asmkhalid111/portfolio`, and pushing code to GitHub.
- [ ] **3. Authorization for Gate C (Vercel):** Authorize linking the GitHub repository to Vercel Hobby and triggering the initial public deployment.
- [ ] **4. Public Homepage Bio Text Approval:** Approve the introductory candidate copy for the foundation homepage (Name, DIU student status, and candidate project highlights).

---

## 15. Expected Implementation Evidence

Upon completion of M01 Gate A implementation, the following concrete artifacts must be documented in `GATE_A_REPORT.md`:
1. Actual executed command lines and exit codes for scaffolding, installs, linting, typechecking, tests, and build.
2. Verified package versions in `package.json` and `package-lock.json`.
3. Vitest test output and Playwright test summary.
4. Pre-publication audit execution output.
5. Verification that `GATE_A_REPORT.md` exists and is read back from disk.

---

*Gate A Implementation in Progress. Gate B and Gate C remain unauthorized.*
