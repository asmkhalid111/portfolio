# Portfolio MVP Scope & Reduced Delivery Roadmap

**Context:** The comprehensive historical roadmap and extended security audit are closed. The active project scope is officially focused on delivering a teacher-ready, verifiable university demonstration portfolio within a 15 development-hour budget.

---

## 1. Active Reduced Milestones (R1 – R4)

The active roadmap consists exclusively of the following four milestones:

### Milestone R1 — Functional Administrator Authentication (NEXT)
- **Objective:** Establish functional local administrator authentication for demonstration purposes.
- **Key Deliverables:**
  - Seed or prepare a dedicated local test administrator account in `auth.users` and `private.admin_users`.
  - Validate administrator login, dashboard session persistence, and logout on `http://localhost:3000/admin`.
  - Verify that unauthenticated visitors and authenticated non-admin users are strictly blocked from `/admin`.
- **Status:** **NEXT ACTIVE MILESTONE** (Awaiting explicit start instruction).

### Milestone R2 — Projects CRUD (UNAUTHORIZED)
- **Objective:** Implement verifiable CRUD operations for portfolio projects in the admin dashboard.
- **Key Deliverables:**
  - Create project: title, slug, summary, description, tech stack tags, repository/live URLs, published status.
  - List projects in administrative dashboard with status badges (Published / Draft).
  - Update project details and toggle publish/unpublish.
  - Delete project with confirmation.
  - Protect all mutations with server-side administrator authorization and database RLS.
- **Status:** NOT AUTHORIZED for implementation yet.

### Milestone R3 — Public Portfolio (UNAUTHORIZED)
- **Objective:** Render the public-facing portfolio website populated with the owner's CV and published projects.
- **Key Deliverables:**
  - Home / Overview: introduction, education, internship experience, skills, GitHub/LinkedIn/contact links.
  - Projects Section: display published projects fetched from Supabase.
  - Project Detail Pages: simple, clean, responsive project view (`/projects/[slug]`).
  - Mobile-first, responsive, and accessible styling.
- **Status:** NOT AUTHORIZED for implementation yet.

### Milestone R4 — Vercel Deployment & Teacher Demonstration (UNAUTHORIZED)
- **Objective:** Production deployment and live instructor evaluation.
- **Key Deliverables:**
  - Apply the single pending RPC migration (`20261118000004_public_is_admin_rpc.sql`) to hosted Supabase (`zvmjdssztebhzpplkcrn`).
  - Provision one administrator identity on hosted Supabase.
  - Deploy the production build to Vercel with verified environment variables.
  - Perform live instructor walkthrough demonstrating working project CRUD and public display.
- **Status:** NOT AUTHORIZED for implementation yet.

---

## 2. Frozen & Out-of-Scope Features

To stay strictly within the 15-hour delivery target, the following are explicitly **frozen and excluded**:
- **NO** analytics platforms, tracking cookies, or logging telemetry services.
- **NO** multi-administrator role management, invites, or delegation flows.
- **NO** complex S3/Supabase Storage bucket media upload pipelines (use direct URL references or static assets for MVP).
- **NO** complex animations, canvas interactions, or heavy 3D graphic libraries.
- **NO** advanced headless CMS extensions, drafting version trees, or scheduled publishing.
- **NO** large 25-case test expansion matrices or exhaustive audit cycles.
- **NO** scope creep beyond the four defined R1–R4 milestones.

---

## 3. Preserved Architecture & Quality Baseline

- **Preserve:** Existing Next.js 16 App Router code, database migrations (M02 + Gate B RPC), Supabase SSR authentication, security headers, and existing test suites.
- **Historical Documents:** Files under `docs/milestones/` and `docs/ROADMAP.md` remain historical reference records and are **not** mandatory unfinished development obligations. Do not delete or move historical files.
- **Safety Boundary:** All development work remains strictly local. No remote Git pushes, branch merges, rebases, or hosted Supabase modifications without separate explicit owner authorization.
