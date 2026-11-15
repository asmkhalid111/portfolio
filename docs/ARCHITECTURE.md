# System Architecture

> **Status:** APPROVED IN M00 (Architecture v0.3 / v0.4)  
> **Target Framework:** Next.js 16 App Router (Active LTS, Node 26 runtime)  
> **Backend Integration:** Supabase (PostgreSQL, Auth, Storage) — Deferred to M02  
> **Hosting & CI:** Vercel Hobby (First deploy planned in M01) + GitHub Actions

---

## 1. Technical Stack

- **Framework:** Next.js 16 App Router (Active LTS baseline: `16.4.6`, subject to stable patch revalidation in M01).
- **Language & Runtime:** TypeScript in strict mode (`^5.7.3`), running on Node.js 26 LTS (`v26.7.0` local, pinned to `26.x` across CI and Vercel).
- **Styling & Design Tokens:** Tailwind CSS v4 (`^4.0.9`) with plain CSS design tokens defined via `@theme` and `:root` variables, avoiding unconstrained utility classes or generic templates.
- **Backend Services:** Supabase managed PostgreSQL, GoTrue Auth, and S3-compatible Storage. Client access utilizes `@supabase/ssr` (`^0.5.2`) and `@supabase/supabase-js` (`^2.48.0`), scheduled for introduction in **M02**.
- **Payload Validation:** Zod (`^3.24.2`) for server-side runtime schema validation of all Server Actions and mutation inputs.
- **Testing Harness:** Vitest (`^3.0.7`) + React Testing Library (`^16.2.0`) for unit and integration tests; Playwright (`^1.50.1`) for browser-driven end-to-end and negative security tests.
- **Hosting & Infrastructure:** Vercel Hobby tier for non-commercial personal portfolio deployment; GitHub Actions for continuous integration.

---

## 2. Data Flow & Security Architecture

```
[Public Visitor] ──► [Next.js Server Components] ──► [PostgreSQL via Publishable Key]
                           (SSR / Static HTML)              (RLS: status = 'published')

[Admin User]     ──► [/admin/login] ──► [Supabase Auth] ──► Session Cookie
                     └──► [/admin/*] ──► [proxy.ts Edge Guard] (Fast redirect if no session)
                            └──► [Server Actions / Mutation Handlers]
                                   ├── 1. Zod input payload validation
                                   ├── 2. Verify auth.uid() in public.admin_users
                                   └── 3. PostgreSQL Database Operation (RLS enforced)
```

### 2.1 Multi-Layered Defense-in-Depth
1. **Edge Routing Guard (`proxy.ts`):** Next.js 16 edge routing handler inspects authentication session cookies on `/admin/*` routes, redirecting unauthenticated traffic to `/admin/login`. Edge checks are UX optimizations and **never** treated as security boundaries.
2. **Server-Side Authorization:** Every Server Action and mutation handler verifies user identity via `supabase.auth.getUser()`, validates inputs against strict Zod schemas, and explicitly queries `public.admin_users` to verify administrative status before initiating database operations.
3. **Database Row-Level Security (RLS) & Grants:** PostgreSQL kernel enforces table-level SQL grants and RLS policies on all tables. Functions use `SECURITY DEFINER SET search_path = ''` with execution revoked from `PUBLIC` and `anon`. Direct PostgREST requests using the public client key cannot read unpublished drafts or mutate data.

---

## 3. Entity Model & Relational Boundaries

- **`admin_users`:** Whitelist table storing administrative user identifiers (`id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, email TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ`). Initialized strictly out-of-band by the database owner; self-service admin signup is prohibited.
- **`site_profile`:** Singleton editable profile record (full name, headline, short/full bio, location, verified public contact flags, updated_at).
- **`projects`:** Core showcase entity (`id UUID PRIMARY KEY, created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, title TEXT, slug TEXT UNIQUE, summary TEXT, problem TEXT, approach TEXT, outcome TEXT, technologies TEXT[], repository_url TEXT, live_demo_url TEXT, featured BOOLEAN, status TEXT CHECK ('draft', 'published'), sort_order INT, created_at, updated_at`).
- **`project_media`:** Media assets belonging to projects (`id UUID PRIMARY KEY, project_id UUID REFERENCES projects(id) ON DELETE CASCADE, storage_path TEXT, alt_text TEXT, sort_order INT`).
- **`experiences`:** Work and internship history (`id UUID PRIMARY KEY, company TEXT, role TEXT, start_date DATE, end_date DATE, is_current BOOLEAN, description TEXT, sort_order INT`).
- **`education`:** Academic qualifications (`id UUID PRIMARY KEY, institution TEXT, degree TEXT, field_of_study TEXT, start_year INT, end_year INT, grade TEXT, sort_order INT`).
- **`skills`:** Categorized technical proficiencies (`id UUID PRIMARY KEY, name TEXT, category TEXT, proficiency TEXT, sort_order INT`).
- **`certifications`:** Verified credentials (`id UUID PRIMARY KEY, name TEXT, issuer TEXT, issue_date DATE, credential_url TEXT, sort_order INT`).

*Relational Invariant:* `admin_users` functions as an authorization whitelist and does not enforce an unnatural foreign key on domain tables. Projects maintain an optional `created_by` author attribution foreign key.

---

## 4. Phased Implementation & Deployment Boundary

- **Milestone 01 (Foundation):** Next.js 16 application scaffolded non-destructively; standard TypeScript strict, Tailwind v4, linting, and build verified locally; Git repository initialized and deployed to Vercel Hobby as a minimal public application shell. **Zero Supabase credentials or database connections are required in M01.**
- **Milestone 02 (Database Integration):** Supabase project provisioned by owner; declarative SQL migrations executed; table privileges and RLS security policies established; database integration verified via automated negative authorization tests.
- **Milestone 03 (Admin Identity):** Authentication UI and session management integrated; out-of-band admin provisioning verified.
- **Milestone 04 (Projects CRUD Vertical Slice):** Full persistent create, read, update, delete operations implemented with draft/publish lifecycle and strict public 404 isolation for drafts.

---

## 5. Security & Reliability Invariants

1. **Least Privilege Credentials:** The application exclusively deploys the Supabase publishable client key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). The `SUPABASE_SERVICE_ROLE_KEY` completely bypasses RLS and is strictly prohibited in client bundles, application deployments, and version control.
2. **Draft Isolation:** Public requests for draft or unapproved projects must strictly return HTTP 404 (Not Found). Draft content must never leak into rendered HTML, JSON payloads, OpenGraph tags, or cache layers.
3. **Graceful Degradation:** The public portfolio homepage is engineered to degrade gracefully (rendering static biographical fallback copy) if the Supabase free-tier database is paused due to inactivity, preventing an unhandled 500 error. Admin routes fail closed.
4. **Single Application Simplicity:** All product functionality resides in a single maintainable full-stack Next.js repository. No external microservices, standalone Java/Python backends, or complex ORM layers are introduced.
