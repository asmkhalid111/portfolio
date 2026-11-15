# Milestone Roadmap

> **Status:** APPROVED BASELINE (M00 Architecture v0.3 / v0.4)  
> **Governance:** Plan $\rightarrow$ ChatGPT Review $\rightarrow$ Explicit Owner Approval $\rightarrow$ Implementation $\rightarrow$ Completion Evidence $\rightarrow$ External Audit $\rightarrow$ Acceptance.

---

## 1. Milestone Schedule (M00 — M10)

| ID | Milestone Title | Scope & Required Verifiable Outcomes | Dependencies & Preconditions |
|---|---|---|---|
| **M00** | **Discovery, Architecture & Governance** | Environment inventory, Next.js 16 Active LTS baseline, ADRs, database model, hardened RLS spec, testing strategy, risk register, approved plan and completion report. *(Documentation only; zero app code).* | None |
| **M01** | **Environment, Foundation & First Deploy** | Non-destructive Next.js 16 scaffold, strict TypeScript, Tailwind v4, lint/typecheck/build/test verification, pre-publication privacy scan, Git repository initialization, and first live public Vercel deployment shell. *(Zero Supabase credentials; Supabase libraries deferred).* | Approved M00 |
| **M02** | **Database Integration & RLS Foundation** | Supabase project provisioning by owner, declarative PostgreSQL migrations, table privileges, hardened RLS matrix, typed client access layer (`@supabase/ssr`), seed fixtures, and automated negative authorization tests. | Approved M01 |
| **M03** | **Administrator Identity & Auth Boundaries** | Supabase Auth session management, `/admin/login` page (no redirect loops), out-of-band admin provisioning verification, protected server actions, and unauthorized mutation rejection. | Approved M02 |
| **M04** | **First Vertical Slice: Projects CRUD** | Full persistent Create, Read, Update, Delete for projects; draft/publish workflow; strict public 404 isolation for drafts; automated Playwright E2E CRUD suite across fresh browser contexts. *(Academic Core Priority).* | Approved M03 |
| **M05** | **Distinctive Public Portfolio Design** | Design system implementation, Hallmark-inspired design tokens, responsive editorial homepage, project case-study views, about/experience sections, anti-slop audit. | Approved M04 |
| **M06** | **Remaining Manageable Content CRUD** | Admin CRUD dashboard sections for experiences, skills, education, certifications, and site profile; public sections dynamically reflect changes. | Approved M05 |
| **M07** | **Media Storage & Content Polish** | Supabase Storage bucket (`project-media`) with RLS, authenticated image uploads, image optimization, loading/empty/error states, and responsive refinements. | Approved M06 |
| **M08** | **SEO, Accessibility & Performance** | Canonical URLs, OpenGraph/Twitter cards, Schema.org JSON-LD structured data, Lighthouse CI accessibility audit ($\ge 95$), and measured Core Web Vitals (LCP, CLS, interactive INP). | Approved M07 |
| **M09** | **Hardening, CI Pipeline & Disaster Recovery** | Complete Playwright regression suite, GitHub Actions CI workflow, secret scanning, documented `pg_dump` backup runbook, and free-tier inactivity unpause drill. | Approved M08 |
| **M10** | **Final Release, Documentation & University Demo** | Tagged stable release (`v1.0.0`), production smoke test, README, ERD diagrams, live demo script, CRUD demonstration evidence, and final academic submission packet. | Approved M09 |

---

## 2. Core Strategic Policies

### 2.1 Academic CRUD Priority (M04 Before M05)
Milestone **M04** represents the mandatory, feature-complete CRUD vertical slice required for university assessment. Visual styling and aesthetic polish (M05) are strictly sequenced after persistent database CRUD and authorization have been proven through automated tests.

### 2.2 Phased Deployment Policy (M01 vs M02)
- **M01 Deployment:** Deploys a minimal public application shell ("Foundation") with zero Supabase credentials or database connections. This proves the CI/CD pipeline, SSL configuration, and hosting without exposing unverified secrets.
- **Supabase Deferral:** Installation of `@supabase/supabase-js` and `@supabase/ssr` is explicitly deferred to **M02**, when the database schema and RLS policies are provisioned.

### 2.3 Milestone Acceptance Rule
A milestone is never declared complete based solely on descriptive summaries. Every milestone requires an on-disk `docs/milestones/Mxx-slug/COMPLETION.md` recording actual executed commands, exit codes, test outputs (passed/failed/not-run), git commit SHA (when Git exists), deployed URL (when deployed), and a reviewer checklist.
