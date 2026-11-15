# Risk Register + Error Log

> **Operating Invariant:** Record **anticipated risks** separately from **observed errors**. Never describe predicted risks or theoretical failure modes as actual incidents.

---

## 1. Anticipated Risks & Prevention Controls

| Risk ID | Risk Category | Description & Potential Impact | Prevention & Mitigation Controls | Status |
|---|---|---|---|---|
| **R01** | **Infrastructure** | **Supabase Free Project Inactivity Pause:** Supabase Free projects pause after 7 consecutive days of database inactivity, which could disrupt a live university demonstration or professor review. | 1. Implement graceful client fallback rendering static biographical copy if the database times out.<br>2. Maintain a documented 1-click unpause runbook in `docs/MEMORY.md`.<br>3. Schedule pre-demo verification check. | Controlled |
| **R02** | **Security** | **Superficial Admin Route Protection:** Protecting admin routes solely via UI hiding or edge redirects (`proxy.ts`) leaves direct API routes or PostgREST open to unauthorized mutation. | 1. Implement 3-tier defense: Edge UX redirect, Server Action authorization check, and PostgreSQL RLS.<br>2. Automated negative Playwright tests asserting 401/403 for unauthorized requests. | Controlled |
| **R03** | **Privacy & Secrets** | **Private Information or Secrets Entering Git History:** Unsanitized CV PDFs, phone numbers, reference emails, or `.env*` files committed to a public GitHub repository. | 1. Enforce strict `.gitignore` rules for `.env*` and `supabase/backups/`.<br>2. Mandatory pre-publication scan of **all tracked files** before making repository public in M01.<br>3. Source-backed `docs/CONTENT_INVENTORY.md` requiring owner approval. | Controlled |
| **R04** | **Design Quality** | **Generic AI-Slop Aesthetic:** AI-generated UI converging on predictable clichés (neon gradients, synthetic metrics, generic cards). | 1. Enforce Hallmark-inspired token rules in `docs/DESIGN.md`.<br>2. Require bespoke CSS variables and authentic engineering diagrams.<br>3. Mandatory anti-slop audit gate before M05 acceptance. | Controlled |
| **R05** | **Content Integrity** | **Fabricated or Outdated CV Claims:** Publishing outdated academic information (e.g. unverified CGPA) or inventing project metrics. | Content inventory strictly tracks candidate facts as `review-needed` until explicitly approved by the project owner. | Controlled |
| **R06** | **Tooling & Scaffolding** | **Existing-File Overwrite During Next.js Scaffolding:** Running `create-next-app` directly against `E:\Codes\Portfolio` may collide with or overwrite governance files (`README.md`, `docs/`, `prompts/`). | Non-destructive scaffold strategy: Scaffold in temporary directory (`temp-scaffold`) using `--disable-git` and `--skip-install`, execute diff-before-copy inventory, transfer only runtime/build assets, and verify clean build. | Controlled |
| **R07** | **Dependencies** | **Dependency Incompatibilities & Canary Drift:** Installing unstable Next.js canary builds or mismatched React 19 / Tailwind peer dependencies breaking builds. | Pin exact resolved versions (`next@16.4.6`, `react@19.0.0`, `tailwindcss@4.0.9`); revalidate compatible patch versions before install; commit strict `package-lock.json`. | Controlled |
| **R08** | **Database Authorization** | **Database Permission / RLS Misconfiguration:** Missing table grants or vulnerable search paths in `SECURITY DEFINER` functions exposing data or allowing privilege escalation. | Hardened function specification (`SECURITY DEFINER SET search_path = ''`); explicitly revoked execute privileges from `PUBLIC`/`anon`; explicit table-level grants paired with RLS policies; negative authorization tests in M02. | Controlled |
| **R09** | **Authentication Routing** | **Authentication Redirect Loops:** Admin layout or `proxy.ts` checking session cookies and redirecting to `/admin/login`, which in turn triggers the admin layout check, causing an infinite redirect loop. | Isolate `/admin/login` in a public route group (`(auth)/admin/login`) or explicitly exempt `/admin/login` and `/api/auth/*` from redirect logic in `proxy.ts`. | Controlled |
| **R10** | **Backup Security** | **Improper Backup Ignore Patterns:** Globally ignoring all `.sql` files breaks Git tracking of migrations, or failing to ignore `supabase/backups/` accidentally commits real database dumps to public Git. | Track migrations strictly (`supabase/migrations/*.sql`, `supabase/seed.sql`); explicitly ignore backup dumps (`supabase/backups/`, `*.dump`, `*.backup`). | Controlled |
| **R11** | **Deployment Runtime** | **Deployment Environment Node Mismatch:** Local environment uses Node 26.7.0, but CI or Vercel builds default to older Node versions, causing runtime incompatibilities. | Pin Node 26 consistently across `.nvmrc`, `package.json` engines (`^26.0.0`), GitHub Actions (`node-version: 26`), and Vercel Project Settings (`26.x`). | Controlled |
| **R12** | **Project Scope** | **Scope Creep Delaying Academic CRUD:** Over-investing in complex blog, analytics, or decorative public features before delivering working CRUD. | Strict roadmap gate: M04 (Projects CRUD vertical slice) must be fully implemented and tested before M05 (Public portfolio design). | Controlled |

---

## 2. Observed Incidents Log

### Incident Records

```
ERR-001 | M01 Gate A | 2026-11-15 16:25 UTC | Severity: Low
Symptom: ESLint flagged unused import warning in src/app/page.tsx: 'Link' is defined but never used.
Reproduction: npm run lint
Root Cause: Early draft of page.tsx included next/link import before moving external links to semantic <a> anchors.
Resolution: Removed unused 'Link' import from src/app/page.tsx.
Verification Evidence: npm run lint exited with code 0 (0 errors, 0 warnings).
Status: Resolved
Commit SHA: Pre-Git (Local Gate A)
```

```
ERR-002 | M01 Gate A | 2026-11-15 16:25 UTC | Severity: Low
Symptom: Vitest assertion failed in tests/unit/homepage.test.tsx: expected container not to match /password/i.
Reproduction: npm test
Root Cause: Project card summary for Web-LAN-Chat contained technical phrasing "secure password hashing", which triggered the negative DOM privacy regex assertion.
Resolution: Refined project description to "cryptographic credential hashing", preserving technical fidelity while eliminating false-positive credential leak assertions.
Verification Evidence: npm test exited with code 0 (4/4 tests passed).
Status: Resolved
Commit SHA: Pre-Git (Local Gate A)
```

```
ERR-003 | M01 Gate A | 2026-11-15 16:26 UTC | Severity: Medium
Symptom: Next.js 16 build prerender failure: "Next.js encountered the unstable value 'new Date()' while prerendering in src/components/layout/footer.tsx".
Reproduction: npm run build
Root Cause: Next.js 16 Partial Prerendering and Cache Components disallows nondeterministic Date() calls during static prerendering of server components.
Resolution: Replaced dynamic new Date().getFullYear() in Footer component with deterministic constant CURRENT_YEAR = 2026;.
Verification Evidence: npm run build exited with code 0; static routes / and /_not-found generated in 902ms.
Status: Resolved
Commit SHA: 15320cf
```

```
ERR-004 | M01 Gate B1 | 2026-11-15 16:45 UTC | Severity: High
Symptom: npm audit flagged 2 critical vulnerabilities in node_modules/tinypool (prototype pollution RCE GHSA-5gmw-xhrv-c9v3 and GHSA-85c8-ppgw-ccpr) via vitest@3.2.7.
Reproduction: npm audit
Root Cause: Vitest 3.x relied on vulnerable tinypool versions; Vitest 5.1.0 resolved the vulnerability upstream.
Resolution: Upgraded vitest to 5.1.0 cleanly without --force or --legacy-peer-deps; modernized config to vitest.config.mts using import.meta.dirname.
Verification Evidence: npm audit shows 0 critical vulnerabilities; npm test passes cleanly (4/4 passed).
Status: Resolved
Commit SHA: 15320cf
```

```
ERR-005 | M01 Gate B1 | 2026-11-15 16:45 UTC | Severity: Low
Symptom: Playwright computed-style assertion failure: expected hero CTA button background to equal "rgb(17, 24, 39)", but received "lab(8.11897 0.811279 -12.254)".
Reproduction: npm run test:e2e
Root Cause: Tailwind CSS v4 compiles colors using modern wide-gamut OKLCH/LAB color spaces in modern browsers (Chromium), which do not serialize to legacy RGB notation.
Resolution: Refined browser test to validate geometric computed properties (border-radius: 8px, display: flex, position: sticky) and regex-match modern wide-gamut color compilation.
Verification Evidence: npm run test:e2e passed all 12 tests across Desktop and Mobile Chromium.
Status: Resolved
Commit SHA: 15320cf
```

```
ERR-006 | M01 Gate B2 | 2026-11-15 17:41 UTC | Severity: High
Symptom: GitHub Actions workflow runs (43742469140, 43742711733) failed immediately with annotation: "The job was not started because your account is locked due to a billing issue."
Reproduction: Push commit to asmkhalid111/portfolio on branch main, or run gh run rerun 43742711733.
Root Cause: External account-level platform lock on the owner's GitHub account (asmkhalid111); runner did not execute. Local validation suite passes 100%.
Resolution: Documented owner billing resolution runbook; requires Project Owner to visit https://github.com/settings/billing to resolve account lock and re-run workflow. Rerun attempt 2 (job ID 132908047611) confirmed account remains locked.
Verification Evidence: gh run view 43742469140 and gh run view 43742711733 annotations.
Status: Active (Blocked on Owner Account Resolution)
Commit SHA: 8665710
```

### Incident Report Template (For Post-M01 Use)
```
ERR-### | Milestone | Detected At (UTC) | Severity (Low/Med/High/Crit) |
Symptom: <observable failure>
Reproduction: <exact command or journey>
Root Cause: <underlying technical flaw>
Resolution: <corrective fix applied>
Verification Evidence: <test output or log>
Status: Resolved / Active
Commit SHA: <git hash>
```
