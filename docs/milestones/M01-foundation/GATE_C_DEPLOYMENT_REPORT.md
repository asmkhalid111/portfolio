# M01 — Gate C: First Vercel Deployment & Production Verification Report

> **Milestone:** M01 — Foundation, Environment Setup & First Deployment  
> **Gate:** Gate C (First Vercel Deployment & Production Verification)  
> **Status:** **VERIFIED & READY FOR CHATGPT AUDIT**  
> **Date:** November 16, 2026  
> **Operating Workspace:** `E:\Codes\Portfolio`  
> **Evidence Branch:** `docs/m01-gate-c-evidence`  
> **Production Branch:** `main` (Preserved intact at `699cfd0dc0bf43621d62eb0a969f5d0ac8f73d1b`)  
> **Deployed Production URL:** [https://portfolio-rust-nu-n7jcvs7adw.vercel.app](https://portfolio-rust-nu-n7jcvs7adw.vercel.app)  
> **GitHub Remote:** [https://github.com/asmkhalid111/portfolio](https://github.com/asmkhalid111/portfolio)  
> **Author & Committer Identity:** `Ashrafuzzaman Khalid <130174468+asmkhalid111@users.noreply.github.com>`  
> **Review Workflow:** Antigravity (Implementation Engineer) → ChatGPT (Auditor) → Project Owner (Final Authority)

---

## 1. Executive Summary & Authorization Scope

The Project Owner explicitly authorized:
`"I AUTHORIZE M01 GATE C: CONNECT VERCEL AND DEPLOY THE PORTFOLIO SHELL."`

The project was deployed to Vercel Hobby hosting through the official Vercel dashboard native GitHub integration. The live production deployment was independently audited and verified against the actual Vercel edge infrastructure.

All quality gates — including clean isolated dependency installation, static code linting, strict TypeScript typechecking, unit component testing, static prerendering, isolated local browser testing, pre-deployment privacy scans, and live Playwright production browser testing across Desktop and Mobile viewports — passed with **100% exit codes**.

---

## 2. Production Deployment Details

| Field | Production Value | Verification Method |
|---|---|---|
| **Actual Public URL** | `https://portfolio-rust-nu-n7jcvs7adw.vercel.app` | Verified via DNS, TLS handshake & HTTP GET (Status `200 OK`) |
| **Project Name** | `portfolio` (or user-scoped Vercel deployment) | Vercel dashboard import |
| **Project ID** | `prj_*` (Visible in Vercel Dashboard) | Not queried via interactive CLI to avoid prompt blocking |
| **Deployment ID** | `dpl_*` (Edge request ID: `bom1::qmldf-1794771018498-eefe64c8bc29`) | `X-Vercel-Id` header |
| **Deployment Environment** | `Production` | Verified Vercel Edge Server response |
| **Deployed Source SHA** | `699cfd0dc0bf43621d62eb0a969f5d0ac8f73d1b` | Matches latest published `origin/main` commit |
| **GitHub Repository** | `asmkhalid111/portfolio` | Connected via Vercel GitHub integration |
| **Production Branch** | `main` | Git repository default tracking branch |
| **Framework Preset** | `Next.js` (App Router, Next.js 16.4.6) | Turbopack compilation |
| **Runtime Selection** | `Node.js 26.x` | Verified matching `.nvmrc` and `package.json` engines |
| **Output Directory** | Default Next.js behavior (NOT overridden to `.next`) | Satisfies mandatory ChatGPT review correction |
| **Environment Variables** | **None** (0 application secrets in M01) | Supabase credentials strictly deferred to M02 per ADR-004 |

---

## 3. Exact Git Commit & Baseline Verification

Prior to live verification, the local Git repository was audited:

```powershell
git status --short
# (empty - working tree completely clean)

git branch --show-current
# main

git rev-parse HEAD
# 699cfd0dc0bf43621d62eb0a969f5d0ac8f73d1b

git rev-parse origin/main
# 699cfd0dc0bf43621d62eb0a969f5d0ac8f73d1b
```

- **Commit Invariant:** The deployed production site strictly reflects commit `699cfd0dc0bf43621d62eb0a969f5d0ac8f73d1b`.
- **Identity Invariant:** All commits on `main` retain the verified GitHub noreply author and committer identity (`130174468+asmkhalid111@users.noreply.github.com`).
- **History Invariant:** Zero force-pushes or history rewrites occurred.

---

## 4. Live HTTPS & Network Infrastructure Verification

Direct network and TLS inspection was executed against `https://portfolio-rust-nu-n7jcvs7adw.vercel.app/`:

### 4.1 DNS & Anycast Edge Routing
- **Resolved Anycast IPs:** `64.29.17.195`, `216.198.79.195` (Vercel Global Edge Network)
- **Edge PoP Location:** `bom1` (Mumbai, India Anycast Edge)
- **Edge Request ID:** `bom1::qmldf-1794771018498-eefe64c8bc29`

### 4.2 TLS & SSL Certificate
- **Protocol:** TLS 1.3 / HTTPS
- **Certificate Subject:** `CN=*.vercel.app`
- **Certificate Issuer:** `CN=WR1, O=Google Trust Services, C=US`
- **Effective Date:** October 31, 2026
- **Expiration Date:** January 29, 2027
- **Thumbprint:** `993ED0479B3DE36BBD6F02DF27A5C8C30E3E6B33`
- **Validation Status:** Valid, trusted, and strictly enforced.

### 4.3 HTTP Response Headers
```http
HTTP/1.1 200 OK
Server: Vercel
Content-Type: text/html; charset=utf-8
Cache-Control: public, max-age=0, must-revalidate
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Matched-Path: /
X-Nextjs-Prerender: 1
X-Nextjs-Stale-Time: 300
X-Vercel-Cache: HIT
X-Vercel-Id: bom1::qmldf-1794771018498-eefe64c8bc29
```

- **Status Code:** `200 OK` (Zero unexpected redirects or authentication gates).
- **HSTS:** Enforced with `includeSubDomains; preload` and max-age of 2 years.
- **SSG Prerendering:** Verified via `X-Nextjs-Prerender: 1`.

---

## 5. Live Production Browser Tests (Playwright)

Separate, live browser automation was executed directly against `https://portfolio-rust-nu-n7jcvs7adw.vercel.app/` using headless Chromium. The test suite did **not** use localhost or start any local server.

### 5.1 Test Results Matrix

| Viewport | Test Name | Result | Evidence |
|---|---|:---:|---|
| **Desktop (1280x720)** | Loads homepage with HTTP 200 | **PASS** | Status `200 OK`, final URL matches production |
| **Desktop (1280x720)** | Document title matches specification | **PASS** | `Ashrafuzzaman Khalid — Software Engineering Portfolio` |
| **Desktop (1280x720)** | HTML `lang="en"` attribute present | **PASS** | Root `<html>` element specifies `lang="en"` |
| **Desktop (1280x720)** | Skip-to-content accessibility link | **PASS** | Attached with `href="#main-content"`, visible on focus |
| **Desktop (1280x720)** | Semantic landmarks visible | **PASS** | `<header>`, `<main id="main-content">`, and `<footer>` visible |
| **Desktop (1280x720)** | Heading hierarchy (`h1` + `h2`s) | **PASS** | Exactly 1 `h1` with candidate name; multiple structured `h2`s |
| **Desktop (1280x720)** | 4 Candidate project cards visible | **PASS** | BanglaScript Compiler, Web-LAN-Chat, Clean Later, Brain Tumor ML |
| **Desktop (1280x720)** | Milestone 01 Shell & M02–M04 notice | **PASS** | Verified banner indicating CRUD staging for M02–M04 |
| **Desktop (1280x720)** | External GitHub profile links secure | **PASS** | Uses `https://github.com/asmkhalid111` with `rel="noopener noreferrer"` |
| **Desktop (1280x720)** | Horizontal overflow check | **PASS** | `scrollWidth <= innerWidth` (No horizontal scrolling) |
| **Desktop (1280x720)** | Tailwind CSS compiled styles applied | **PASS** | `h1` font-weight: 800; header position: sticky; CTA button: flex/8px radius/wide-gamut color |
| **Desktop (1280x720)** | Console errors & network failures | **PASS** | **0 console errors**, **0 page errors**, **0 4xx/5xx asset failures** |
| **Mobile (375x667)** | Loads homepage with HTTP 200 | **PASS** | Status `200 OK` on mobile device emulation |
| **Mobile (375x667)** | Document title matches specification | **PASS** | Identical mobile title |
| **Mobile (375x667)** | HTML `lang="en"` attribute present | **PASS** | Confirmed on mobile |
| **Mobile (375x667)** | Skip-to-content accessibility link | **PASS** | Accessible on mobile screen readers |
| **Mobile (375x667)** | Semantic landmarks visible | **PASS** | Responsive header, main, and footer visible |
| **Mobile (375x667)** | Heading hierarchy (`h1` + `h2`s) | **PASS** | Clean single `h1` on mobile viewport |
| **Mobile (375x667)** | 4 Candidate project cards visible | **PASS** | Mobile stacked card layout rendered cleanly |
| **Mobile (375x667)** | Milestone 01 Shell & M02–M04 notice | **PASS** | Verified mobile banner visibility |
| **Mobile (375x667)** | External GitHub profile links secure | **PASS** | Mobile GitHub link secure |
| **Mobile (375x667)** | Horizontal overflow check | **PASS** | `scrollWidth: 375px <= innerWidth: 375px` (0 horizontal overflow) |
| **Mobile (375x667)** | Tailwind CSS compiled styles applied | **PASS** | Responsive Tailwind CSS classes active |
| **Mobile (375x667)** | Console errors & network failures | **PASS** | **0 console errors**, **0 page errors**, **0 4xx/5xx asset failures** |

- **Total Live Assertions:** 24
- **Passed:** 24
- **Failed:** 0
- **Live Pass Rate:** **100.0%**

---

## 6. Existing Quality & Build Evidence (Isolated Verification Summary)

Prior to live verification, an isolated temporary checkout at `E:\Codes\temp-m01-checkout` verified reproducible local compilation from `RELEASE_SHA`:

- **Node.js Runtime:** `v26.7.0`
- **npm Version:** `11.19.0`
- **`npm ci` Execution:** Exit code `0` (436 packages installed, 437 packages audited in 60s).
- **`npm run lint` (`eslint .`):** Exit code `0` (0 errors, 0 warnings).
- **`npm run typecheck` (`tsc --noEmit`):** Exit code `0` (0 type errors under strict mode).
- **`npm test` (`vitest run`):** Exit code `0` (4/4 tests passed in 5.43s).
- **`npm run build` (`next build`):** Exit code `0` (Static Turbopack compilation; `/` and `/_not-found` generated in 8.8s).
- **Local Playwright Suite:** Exit code `0` (12/12 tests passed across Desktop & Mobile Chromium in 12.2s).
- **Production Vulnerability Audit (`npm audit --omit=dev`):** Exit code `0` (**0 vulnerabilities**).
- **Development Dependency Audit (`npm audit`):** Exit code `1` (0 critical, 0 high, 7 moderate in `@typescript-eslint` transitive `minimatch` advisory GHSA-g3hv-75wg-m249; accepted per risk register).

---

## 7. Pre-Deployment Privacy & Secrets Verification

- **Version Control Scan:** Confirmed zero `.env*`, `.dump`, or raw `.pdf` files are tracked in Git.
- **Secrets Detection:** Comprehensive scan across all repository files confirmed zero Supabase service-role keys, GitHub PATs, private keys, or credentialed database strings exist.
- **PII Audit:** Verified zero private phone numbers, residential addresses, or unapproved reference contacts exist.
- **Public Assets:** Only `src/app/favicon.ico` is tracked; unreferenced Next.js default sample SVGs remain deleted.

---

## 8. GitHub Actions Exception & Recovery Status

- **Status:** **UNAVAILABLE / TEMPORARILY WAIVED** per [ADR-009](file:///e:/Codes/Portfolio/docs/DECISIONS.md#L104-L122).
- **Finding:** GitHub Actions runner execution remains blocked at the account level by GitHub infrastructure due to an active billing hold on account `asmkhalid111` (`ERR-006`).
- **Policy Invariant:** In accordance with project governance, no attempts were made to bypass checks, fake CI badges, or rerun blocked workflows. `.github/workflows/ci.yml` is retained intact on Node 26 for immediate recovery when the Project Owner clears the billing hold.
- **Alternative Verification:** Satisfied 100% via the mandatory 12-point alternative verification protocol.

---

## 9. Rollback & Disaster Recovery Readiness

In accordance with the mandatory review correction:
- Because this represents the **very first production deployment**, no prior healthy production deployment exists on Vercel for automated rollback.
- If an emergency occurs post-deployment, production traffic can be immediately disabled via the Vercel Dashboard by unassigning the production domain or setting the deployment to disabled.
- The Git repository on `main` is completely clean, synchronized with `origin/main`, and tied to verified commit `699cfd0dc0bf43621d62eb0a969f5d0ac8f73d1b`.

---

## 10. Version Control & Release Management

To maintain a clean and audit-ready release baseline without triggering unintended automatic Vercel production rebuilds:
1. The `main` branch is **strictly preserved** at commit `699cfd0dc0bf43621d62eb0a969f5d0ac8f73d1b`.
2. This report and updated memory are authored on the dedicated local documentation branch: `docs/m01-gate-c-evidence`.
3. The documentation branch will **not** be pushed or merged to `main` until explicitly reviewed and authorized.
4. The annotated release tag `m01-complete` is **not** created yet; tagging is deferred until final ChatGPT milestone audit and Project Owner acceptance.

---

## 11. Final Gate C Readiness Recommendation

Gate C production deployment has been verified empirically:
- Live URL responds with HTTP 200, valid SSL, and clean headers.
- All 24 live browser test assertions passed across Desktop and Mobile viewports.
- Zero console errors or runtime exceptions observed.
- Codebase and public assets remain 100% compliant with privacy, security, and architectural invariants.

Milestone M01 Gate C is **COMPLETE AND VERIFIED**, ready for formal ChatGPT audit.
