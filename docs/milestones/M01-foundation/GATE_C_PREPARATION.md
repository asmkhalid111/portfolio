# M01 — Gate C Preparation: Vercel Production Deployment & Controlled CI Exception

> **Milestone:** M01 — Foundation, Environment Setup & First Deployment  
> **Gate:** Gate C Preparation & CI Exception Governance  
> **Status:** **READY FOR PROJECT OWNER AUTHORIZATION** (Deployment held pending explicit approval)  
> **Date:** November 16, 2026  
> **Target Repository:** [https://github.com/asmkhalid111/portfolio](https://github.com/asmkhalid111/portfolio)  
> **Governing Commit Baseline:** `e2102d94de7b78c62dd155779485de832ad16ef7`  
> **Governing Plan:** `docs/milestones/M01-foundation/PLAN.md` (v0.5)  
> **Review & Decision Authority:** Project Owner (Authorization) · ChatGPT (Auditor) · Antigravity (Implementation Engineer)

---

## 1. Executive Context & Approved CI Exception

### 1.1 Decision Rationale
During Gate B2 execution, the public GitHub repository was successfully created, remote `origin` configured, and sanitized commit history pushed to `main`. However, GitHub Actions CI runs (`43742469140`, `43742711733`) were prevented from dispatching by an account-level GitHub billing lock on account `asmkhalid111` (`ERR-006`).

The Project Owner determined that this external billing lock must not stall portfolio development or delay the academic milestone roadmap. ChatGPT reviewed and accepted this decision as a **controlled exception** to the original M01 requirement for green GitHub Actions CI.

### 1.2 Parameters of the CI Exception
1. **Repository Publication is Complete:** The public repository `asmkhalid111/portfolio` is established, healthy, and up to date on `main`.
2. **GitHub Actions CI Service is Temporarily Waived:** Green GitHub Actions CI status is waived as a blocking precondition for milestone progression and deployment.
3. **Workflow Configuration Retained:** `.github/workflows/ci.yml` is **not** removed or altered to bypass checks. It remains fully configured on Node 26 for immediate recovery when the Project Owner addresses the billing restriction.
4. **Honesty and Evidence Invariant:** The CI failure is recorded factually in `docs/ERRORS.md` (`ERR-006`) and `docs/milestones/M01-foundation/GATE_B_GITHUB_REPORT.md`. A blocked CI run will **never** be misrepresented as passing or satisfied.
5. **Quality Scope Maintained:** The exception applies strictly to the unavailable remote GitHub Actions runner service — **never** to application quality, type safety, test coverage, privacy, or security requirements.
6. **Gate C Authorization Required:** Gate C production deployment remains gated behind explicit, separate Project Owner authorization.

---

## 2. Mandatory Alternative Verification Framework

In the absence of automated GitHub Actions runners, every milestone must pass the following 12-point alternative verification protocol before being submitted for ChatGPT audit and owner acceptance:

| # | Verification Gate | Tool / Command | Required Standard |
|---|---|---|---|
| **1** | **Clean Git Tree** | `git status --short` | Clean working tree; reviewed commits; zero untracked runtime files. |
| **2** | **Isolated Dependency Install** | `npm ci` | Clean, reproducible dependency resolution from committed `package-lock.json`. |
| **3** | **Static Linting** | `npm run lint` (`eslint .`) | Exit code `0`; zero errors, zero warnings under Next.js 16 flat config. |
| **4** | **Strict Typechecking** | `npm run typecheck` (`tsc --noEmit`) | Exit code `0`; zero type errors under TypeScript strict mode. |
| **5** | **Component & Privacy Tests** | `npm test` (`vitest run`) | Exit code `0`; 100% assertions green; negative PII/credential assertions pass. |
| **6** | **Browser E2E Automation** | `npm run test:e2e` (`playwright test`) | Exit code `0`; all specs pass across desktop & mobile viewports. |
| **7** | **Production Compilation** | `npm run build` (`next build`) | Exit code `0`; successful Turbopack static prerender / bundle generation. |
| **8** | **Dependency Audit** | `npm audit --omit=dev` | Exit code `0`; zero high/critical vulnerabilities in production runtime dependencies. |
| **9** | **Privacy & Secrets Scan** | Multi-layer file scanner | Zero PII (phone, address), zero secrets (`SUPABASE_SERVICE_ROLE_KEY`, PATs). |
| **10** | **Durable On-Disk Evidence** | `docs/milestones/Mxx-*/` | Exact commands, exit codes, commit SHAs, and test summaries recorded in markdown. |
| **11** | **Independent External Audit** | ChatGPT Review | Formal structural and architectural review before milestone acceptance. |
| **12** | **Live Deployment Smoke Test** | Post-Deploy Verification | Live HTTP 200, valid SSL, and responsive layout verified after authorized deploys. |

### Milestone-Specific Extensions (M02–M04)
- **M02:** Real Supabase database connection tests, schema migration verification, and automated negative RLS authorization tests (anonymous `INSERT`/`UPDATE` rejection).
- **M03:** Supabase Auth session boundary verification, `/admin/login` loop prevention, and out-of-band admin role verification.
- **M04:** Full Playwright E2E Projects CRUD lifecycle test across fresh browser contexts, asserting public 404 isolation for draft records.

> [!NOTE]
> Local execution provides high engineering confidence, but does not claim to replace independent cloud runners. It is documented accurately as the approved temporary alternative while GitHub Actions is unavailable.

---

## 3. GitHub & Vercel Integration Compatibility Inspection

Before initiating Gate C preparation, potential deployment blockers were audited via the GitHub CLI:

1. **GitHub Branch Protection Audit:**
   ```powershell
   gh api repos/asmkhalid111/portfolio/branches/main/protection
   ```
   *Result:* HTTP 404 (`Branch not protected`). No required status checks exist that would block pushing to `main` or prevent external platforms from reading repository commits.
2. **Repository Rulesets Audit:**
   ```powershell
   gh api repos/asmkhalid111/portfolio/rulesets
   ```
   *Result:* `[]` (Empty list). No repository rulesets or commit status gates are enforced.
3. **Vercel Build Environment Independence:**
   Vercel compiles and builds projects inside its own isolated build containers, independent of GitHub Actions. Because there are no required GitHub status checks, Vercel deployments will not be blocked by the unavailable GitHub Actions runner.

---

## 4. Vercel Deployment Checklist (Gate C Execution Runbook)

When the Project Owner provides explicit authorization for Gate C, the deployment must strictly execute according to this step-by-step checklist:

### Step 1: Account & Project Linkage
- **Platform:** Vercel Hobby Tier ($0/mo, personal non-commercial use permitted per ADR-003).
- **Repository Source:** `asmkhalid111/portfolio` (connected via GitHub OAuth integration).
- **Project Name:** `portfolio` (or `asmkhalid-portfolio` if name is unavailable).

### Step 2: Build & Framework Configuration
- **Framework Preset:** `Next.js` (auto-detected).
- **Root Directory:** `./` (workspace root).
- **Node.js Version:** `26.x`
  - Vercel supports Node.js 26 natively for Next.js builds.
  - Matches local runtime `v26.7.0`, `.nvmrc` (`26`), and `package.json` engines (`"node": "^26.0.0"`).
- **Build Command:** `next build` (default).
- **Output Directory:** `.next` (default).
- **Install Command:** `npm install` (or `npm ci`).

### Step 3: Environment Variables & Secrets Invariant
- **M01 Secret Policy:** **ZERO ENVIRONMENT SECRETS REQUIRED.**
- **Supabase Keys:** `@supabase/supabase-js` and database credentials are intentionally deferred to M02 (per ADR-004). No `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or database strings may be configured in Vercel for M01.
- **Verification:** Ensure the Vercel Project Environment Variables panel remains empty for M01.

### Step 4: Pre-Deployment Privacy Re-Verification
- Confirm that the deployed commit matches the sanitized Git baseline:
  - Commit author uses the verified GitHub noreply address (`130174468+asmkhalid111@users.noreply.github.com`).
  - No personal phone numbers, physical addresses, or unapproved contact channels are rendered.
  - Public bio copy matches approved candidate content from `docs/CONTENT_INVENTORY.md`.

### Step 5: Deployment Execution
- Trigger deployment via Vercel Dashboard ("Deploy") or authorized Vercel CLI.
- Monitor Vercel build log to ensure:
  - Clean dependency resolution.
  - Successful execution of `next build`.
  - Static prerendering of `/` and `/_not-found`.
  - Edge routing assignment with a valid `*.vercel.app` production URL.

### Step 6: Post-Deployment Live Verification & Smoke Testing
Once deployed, perform empirical verification against the live production URL:
1. **HTTP Status & SSL:**
   - Confirm HTTPS returns HTTP `200 OK`.
   - Confirm valid SSL/TLS certificate issued by Let's Encrypt / Vercel.
2. **Live DOM & Rendering:**
   - Header, main (`#main-content`), and footer render visibly.
   - `h1` matches "Ashrafuzzaman Khalid".
   - Foundation project cards render with "Milestone M04 development" notice.
   - External links to GitHub profile contain `rel="noopener noreferrer"`.
3. **Responsive Smoke Test:**
   - Verify layout stability on desktop (1280px) and mobile (375px) viewports with zero horizontal overflow.
4. **Console & Performance Audit:**
   - Inspect browser DevTools on live site; confirm 0 JavaScript console errors.

### Step 7: Rollback & Recovery Strategy
- In the event of an unexpected Vercel production failure:
  1. Inspect Vercel runtime logs for the failed deployment.
  2. If broken, rollback immediately via Vercel Project Dashboard $\rightarrow$ Deployments $\rightarrow$ select previous working deployment $\rightarrow$ "Instant Rollback" (or unassign production domain).
  3. Record the failure incident in `docs/ERRORS.md`.

---

## 5. Remaining Risks & Mitigations

| Risk | Description | Impact | Mitigation |
|---|---|---|---|
| **R11** | Vercel build container Node version mismatch | Medium | Pinned `package.json` engines to `"node": "^26.0.0"`; verify Vercel project settings set to `26.x`. |
| **R03** | Accidental credential exposure in environment variables | Critical | Enforce M01 policy: zero environment variables configured on Vercel for M01. |
| **R06** | Vercel GitHub Checks waiting on GitHub Actions | Low | Verified branch is not protected and has no required check rules; Vercel deploys independently. |

---

## 6. Project Owner Authorization Gateway

> [!IMPORTANT]
> **GATE C DEPLOYMENT IS NOT AUTHORIZED IN THIS TURN.**
> 
> Implementation of Gate C (connecting Vercel, deploying the application, and publishing the live URL) requires explicit Project Owner authorization in a subsequent prompt.
> 
> **Required Project Owner Authorization Statement:**  
> *"I AUTHORIZE M01 GATE C: CONNECT VERCEL AND DEPLOY THE PORTFOLIO SHELL."*

---

*Document authored and verified on disk at `docs/milestones/M01-foundation/GATE_C_PREPARATION.md`.*
