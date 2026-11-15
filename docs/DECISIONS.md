# Architectural Decision Records (ADR)

---

## ADR-000: Unified Application Architecture with Next.js 16 App Router
- **Status:** **ACCEPTED** (Updated & Approved in M00; supersedes provisional draft).
- **Date:** 2026-11-15.
- **Context:** The portfolio project requires an authentic, accessible public presence combined with a demonstrable, authenticated administrator CRUD dashboard for academic university evaluation.
- **Decision:** Build a single unified full-stack application using Next.js 16 App Router (Active LTS, baseline `16.4.6`), React 19, TypeScript strict mode, and Tailwind CSS v4.
- **Rejected Alternatives:**
  - *Decoupled backend (FastAPI / Spring Boot + React SPA):* Rejected due to dual hosting complexity, cold starts on free containers (Render/Fly), CORS maintenance, and violation of the project simplicity principle.
  - *Static site generator (GitHub Pages / Hugo):* Rejected because it cannot provide real authenticated server-side CRUD or persistent draft/publish state.
- **Consequences:** Single repository and unified type system. Zero unnecessary microservices. Relies on Next.js 16 server components for fast SSR and Server Actions for typed mutations.

---

## ADR-001: Three-Party Gated Workflow Governance
- **Status:** **ACCEPTED** (Approved in M00).
- **Date:** 2026-11-15.
- **Context:** To ensure rigorous engineering standards, prevent silent scope creep, and maintain academic auditability, responsibilities must be strictly segregated across participants.
- **Decision:** Enforce a three-party lifecycle:
  1. *Project Owner:* Content owner, account credential holder, final deployment and expenditure authority.
  2. *ChatGPT:* Independent architecture reviewer, technical decision auditor, and milestone acceptance evaluator.
  3. *Antigravity:* Implementation planner, developer, test executor, and documentation maintainer. Cannot approve its own work.
- **Consequences:** All milestones require: Plan $\rightarrow$ Review $\rightarrow$ Explicit Owner Approval $\rightarrow$ Implementation $\rightarrow$ Completion Evidence $\rightarrow$ External Review. Unapproved work is blocked.

---

## ADR-002: Package Manager Selection — npm with Committed Lockfile
- **Status:** **ACCEPTED** (Approved in M00).
- **Date:** 2026-11-15.
- **Context:** The local Windows environment possesses Node.js `v26.7.0` and `npm 11.19.0`. Alternative tools (`pnpm`, `yarn`, `bun`) are not installed in the system PATH.
- **Decision:** Standardize on native `npm` (v11.19.0) as the official workspace package manager. Generate and commit a strict `package-lock.json` in M01.
- **Rejected Alternatives:**
  - *Requiring pnpm/yarn/bun:* Rejected to eliminate external setup blockers, PowerShell execution policy friction, and CI runner discrepancies.
- **Consequences:** Predictable, deterministic dependency resolution across Windows local environment, GitHub Actions CI runners, and Vercel build servers without extra global installations.

---

## ADR-003: Hosting Architecture — Vercel Hobby & Supabase Free Tier
- **Status:** **ACCEPTED** (Approved in M00).
- **Date:** 2026-11-15.
- **Context:** The application requires zero ongoing operational expenditure while providing production-grade edge routing, serverless execution, relational PostgreSQL storage, and secure authentication.
- **Decision:** Host the application frontend and serverless runtime on the Vercel Hobby tier ($0/mo), backed by managed Supabase Free tier ($0/mo) for PostgreSQL, Auth, and Storage.
- **Risks & Mitigations:**
  - *Vercel Hobby:* Permitted strictly for personal, non-commercial academic portfolios.
  - *Supabase 7-day inactivity pause:* Mitigated by designing public pages to degrade gracefully (rendering static biographical fallback copy on DB connection failure) and documenting a 1-click unpause runbook in `docs/MEMORY.md`.

---

## ADR-004: Phased Deployment Boundary — Early M01 Deploy Before Database
- **Status:** **ACCEPTED** (Approved in M00).
- **Date:** 2026-11-15.
- **Context:** Early proof of deployment is a primary milestone goal, but provisioning cloud databases and managing production secrets should not block foundational CI/CD verification.
- **Decision:** Decouple hosting from database integration:
  - *M01:* Deploy a minimal, clean public application shell ("Foundation") to Vercel with zero Supabase credentials or production secrets. Supabase library installations are deferred.
  - *M02:* Provision Supabase, execute SQL migrations, configure environment variables, and establish database connectivity.
- **Consequences:** Eliminates secret exposure risks in initial repository setup. Validates build pipelines and edge SSL routing immediately in M01.

---

## ADR-005: Admin-First CRUD Priority Over Decorative Styling
- **Status:** **ACCEPTED** (Approved in M00).
- **Date:** 2026-11-15.
- **Context:** University grading strictly evaluates functional, persistent CRUD operations backed by real database permissions. Visual polish without functioning CRUD fails academic requirements.
- **Decision:** Prioritize the full Projects CRUD vertical slice in **M04** (admin create, read, update, delete, draft/publish lifecycle, public detail visibility) prior to undertaking bespoke editorial public portfolio styling in **M05**.
- **Consequences:** Guarantees core academic deliverables are proven and locked early in the roadmap before visual refinement.

---

## ADR-006: Multi-Layered Authorization & Hardened PostgreSQL RLS
- **Status:** **ACCEPTED** (Approved in M00).
- **Date:** 2026-11-15.
- **Context:** Securing admin routes solely via UI hiding or middleware checks is brittle and fails security audits. Direct database access via public keys must be defended.
- **Decision:** Implement a three-tier defense-in-depth security model:
  1. *Edge UX Guard (`proxy.ts`):* Fast redirects of unauthenticated traffic on `/admin/*` to `/admin/login`.
  2. *Server-Side Authorization:* Server Actions validate inputs via Zod and verify `auth.uid()` against `public.admin_users`.
  3. *Database Table Grants & RLS:* PostgreSQL enforces granular table-level `GRANT` permissions and Row-Level Security policies. Functions use `SECURITY DEFINER SET search_path = ''` with execution revoked from `PUBLIC` and `anon`. Initial admin accounts are provisioned strictly out-of-band.
- **Consequences:** Even if client-side or edge checks are bypassed, the database layer rejects unauthorized mutations.

---

## ADR-007: Git Branching Model, Commit Conventions & Milestone Tagging
- **Status:** **ACCEPTED** (M01 Gate B1).
- **Date:** 2026-11-15.
- **Context:** A predictable, auditable version-control workflow is required for academic assessment and multi-agent coordination. Blind staging or unstructured commits compromise traceability.
- **Decision:**
  1. *Branching Strategy:* The `main` branch represents reviewed, stable project state. Milestone work and features use short-lived branches (`feat/m02-database`, `feat/m03-auth`, `feat/m04-projects-crud`, `fix/<description>`). Branches are merged only after successful verification and audit acceptance.
  2. *Commit Standards:* Strict Conventional Commits specification (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`). Explicit file staging only (no blind `git add .`).
  3. *Release Tagging:* Milestone tags (e.g. annotated tag `m01-complete`) are created only when a milestone has passed its final audit and has been approved by the Project Owner. Never create retrospective tags across unverified code snapshots.
  4. *Safety Invariants:* No force-pushing, history rewriting, or destructive resets on shared or baseline branches.
- **Consequences:** Provides reproducible traceability, clean commit logs, and unambiguous milestone demarcation.

---

## ADR-008: Tailwind CSS v4 Build Pipeline via PostCSS Integration
- **Status:** **ACCEPTED** (M01 Gate B1).
- **Date:** 2026-11-15.
- **Context:** Initial scaffolding configured `@tailwindcss/turbopack` loader rules in `next.config.ts`. However, `@tailwindcss/turbopack` is an early Turbopack-specific loader whose official release notes began in Tailwind v4.3.4, whereas the official Tailwind CSS v4 guide for Next.js specifies `@tailwindcss/postcss` with `postcss.config.mjs`.
- **Decision:** Standardize on the official Tailwind/PostCSS integration (`@tailwindcss/postcss` + `postcss` in `postcss.config.mjs`) and remove dedicated `turbopack.rules` from `next.config.ts`.
- **Consequences:** Eliminates loader fragility, avoids duplicate/conflicting CSS processing pipelines, supports both Turbopack and Webpack transparently, and outputs modern wide-gamut CSS color functions (`lab`/`oklch`) verified via browser-level computed-style tests.
