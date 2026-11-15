# Testing Specification & Evidence Policy

> **Status:** **APPROVED BASELINE** (Updated in M01 Gate C Preparation per ADR-009)  
> **Governance:** Mandatory 12-Point Alternative Verification Protocol (In effect while GitHub Actions CI is unavailable)

---

## 1. Verified Core Test Suite & Commands

The following commands are configured in `package.json` and validated locally:

| Command | Execution Target | Pass Standard |
|---|---|---|
| `npm run lint` | ESLint 10 flat configuration (`eslint .`) | Exit code `0`; 0 errors, 0 warnings. |
| `npm run typecheck` | TypeScript compiler (`tsc --noEmit`) | Exit code `0`; strict mode zero errors. |
| `npm test` | Vitest native ESM runner (`vitest run`) | Exit code `0`; 100% component and privacy assertions green. |
| `npm run build` | Next.js 16 production compiler (`next build`) | Exit code `0`; static prerender succeeds. |
| `npm run test:e2e` | Playwright browser automation (`playwright test`) | Exit code `0`; all tests pass in Chromium & Mobile Chrome. |
| `npm audit --omit=dev` | Production dependency vulnerability audit | Exit code `0`; 0 vulnerabilities in runtime packages. |

---

## 2. Mandatory 12-Point Alternative Verification Protocol

While GitHub Actions CI runner minutes remain blocked by an external account-level billing restriction (`ERR-006`), automated CI execution is temporarily waived. Every milestone must satisfy this 12-point alternative verification protocol before submission for ChatGPT audit and Project Owner acceptance:

1. **Clean Working Tree & Reviewed Commits:** `git status --short` must report a completely clean working tree. All commits must follow Conventional Commits and use the verified GitHub noreply author identity.
2. **Reproducible Dependency Installation:** `npm ci` must execute successfully in a clean checkout or isolated environment, strictly matching `package-lock.json`.
3. **Static Code Linting:** `npm run lint` must pass with zero errors and zero warnings.
4. **TypeScript Strict Typechecking:** `npm run typecheck` must pass with zero type errors.
5. **Component & Privacy Unit Tests:** `npm test` must execute all Vitest suites, verifying component rendering, semantic structure, and asserting the absence of unapproved credentials or PII.
6. **Browser E2E Automation:** `npm run test:e2e` must pass across configured desktop and mobile viewports.
7. **Production Build:** `npm run build` must compile and prerender static routes cleanly with zero build warnings or unstable dynamic evaluation errors.
8. **Dependency Audit:** `npm audit --omit=dev` must confirm zero vulnerabilities in runtime production dependencies. Full `npm audit` findings must be transparently documented.
9. **Privacy & Secrets Scan:** Multi-layer regex audit across all tracked files asserting zero leaked API keys, tokens, Supabase service-role keys, private phone numbers, or physical addresses.
10. **Durable On-Disk Verification Evidence:** Milestone records (`docs/milestones/Mxx-*/`) must capture actual commands executed, exit codes, execution times, test counts, commit SHAs, and limits.
11. **Independent External Audit:** ChatGPT must independently review and audit completion evidence before milestone acceptance.
12. **Live Post-Deployment Smoke Verification:** Following any authorized Vercel deployment, live HTTPS status 200, SSL validity, and mobile/desktop rendering must be verified empirically.

> [!IMPORTANT]
> **Reporting Invariant:**
> Local test execution provides rigorous engineering proof, but must **never** be claimed to replace the value of an independently hosted CI environment. Describe local results transparently as the approved temporary alternative.
> 
> In all milestone reports, categorize tests separately under:
> - **Passed:** Executed and exited with code 0.
> - **Failed:** Executed and exited with non-zero code.
> - **Blocked:** Unable to run due to environment, credential, or upstream platform constraints.
> - **Not Applicable:** Explicitly deferred or out of scope for the current milestone.

---

## 3. Milestone-Specific Verification Requirements

### M02: Database Integration & RLS Foundation
- Real Supabase project connection verification via `@supabase/ssr`.
- Migration idempotency: migrations execute cleanly against a fresh database.
- **Automated Negative Authorization Tests:**
  - Anonymous client direct PostgREST `INSERT`/`UPDATE`/`DELETE` must be rejected with 401/403.
  - Authenticated non-admin client direct write must be rejected with 403.
  - Public `SELECT` queries return only published records.

### M03: Administrator Identity & Auth Boundaries
- Supabase Auth session creation, refresh, and termination verification.
- Protected route redirection verification: unauthenticated visits to `/admin/*` redirect cleanly to `/admin/login`.
- Out-of-band admin role verification: confirming that self-service registration cannot escalate to administrator privileges.
- Infinite redirect loop prevention tests.

### M04: First Vertical Slice: Projects CRUD (Academic Core)
- Playwright E2E full lifecycle test in fresh, isolated browser contexts:
  1. Admin authentication.
  2. Create draft project with title, description, and technical tags.
  3. Verify project exists in admin dashboard.
  4. Edit draft project properties and save.
  5. Assert project detail returns HTTP 404 to anonymous visitors while in draft state.
  6. Publish project and assert immediate visibility on public project page.
  7. Delete project and assert persistent removal from both admin dashboard and public routes.
  8. Validation error display for missing required fields.

### M08: Accessibility, Performance & SEO
- Keyboard-only navigation audit (focus visible, logical tab order, skip-link activation).
- Automated axe-core accessibility audit (zero critical or serious violations).
- CSS reduced-motion conformance (`prefers-reduced-motion`).
- Lighthouse CI audit: Performance $\ge 90$, Accessibility $\ge 95$, Best Practices $\ge 95$, SEO $\ge 95$.
- Core Web Vitals measurement: LCP $< 2.5\text{s}$, CLS $< 0.1$, INP $< 200\text{ms}$.

### M09: Hardening & Disaster Recovery
- Repeat full automated regression and security test suites.
- Automated secret and token scanning across repository history.
- Documented and tested `pg_dump` backup runbook.
- Supabase free-tier 7-day inactivity pause/unpause recovery drill.
