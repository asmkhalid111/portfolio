# Security Specification & Policy

> **Status:** APPROVED BASELINE (M00 Architecture v0.3 / v0.4)  
> **Enforcement Model:** Multi-Layered Defense-in-Depth (Edge UX $\rightarrow$ Server Authorization $\rightarrow$ Database RLS)

---

## 1. Core Security Principles

1. **Mandatory Server-Side Authorization:** Every mutation (Server Action or Route Handler) must extract the authenticated session via `supabase.auth.getUser()`, validate inputs using Zod, and explicitly verify user membership in `public.admin_users`. Never rely on client state or UI element visibility.
2. **`proxy.ts` Edge Redirects are NOT Security Boundaries:** The Next.js 16 `proxy.ts` edge handler provides fast user-experience redirects to `/admin/login`. It must **never** be considered an authorization barrier. All endpoints and mutations must be independently secured.
3. **Database-Level Row-Level Security (RLS) & Table Grants:** PostgreSQL enforces table-level SQL grants and Row-Level Security policies on every operation:
   - `anon`: Granted only `SELECT` on public entities (`projects`, `skills`, `experiences`, `education`, `site_profile`, `certifications`). No write privileges exist.
   - `authenticated`: Granted mutation privileges, but RLS policies strictly gate modifications behind `public.is_admin()`.
   - `admin_users`: Has zero public privileges; readable strictly by authenticated admins.
4. **Hardened `SECURITY DEFINER` Functions:** Functions executed with elevated creator privileges (such as `public.is_admin()`) must be hardened against search-path hijacking:
   - Configured with `SECURITY DEFINER SET search_path = ''` using fully schema-qualified object references (e.g. `public.admin_users`, `auth.uid()`).
   - Stored function execution is explicitly revoked from `PUBLIC` and `anon` (`REVOKE EXECUTE ... FROM PUBLIC, anon; GRANT EXECUTE ... TO authenticated;`).
5. **Out-of-Band Admin Provisioning:** The application strictly prohibits public or self-service administrator registration. Administrative accounts are created out-of-band by the database owner inserting the user UUID directly into `public.admin_users`.
6. **Least Privilege Key Management:** The application deploys exclusively the Supabase publishable client key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies and is strictly forbidden in client bundles, public code, and standard application operations.
7. **Strict Draft Isolation & Zero Content Leakage:** Public requests for draft projects must strictly return HTTP 404 (Not Found). Draft titles, summaries, technical notes, or media paths must never leak into rendered HTML, JSON payloads, OpenGraph metadata, or browser caches.
8. **Secrets & Privacy Protection:**
   - `.env.local`, `.env*.local`, and `supabase/backups/` must remain in `.gitignore`.
   - Prior to making the repository public in M01, a pre-publication scan of **all tracked files** (including `docs/`, `prompts/`, and `README.md`) must verify that no personal phone numbers, physical addresses, reference contacts, CV PDFs, or credentials exist.

---

## 2. Specification Status of SQL Definitions

> [!WARNING]
> The SQL schema definitions and RLS policies documented in `PLAN.md` represent a **draft security specification for M02**. They are **NOT** yet executed, tested, or approved as production database migrations.
>
> During M02, M03, and M04, all SQL policies must undergo automated negative security testing:
> - Anonymous users attempting direct PostgREST `INSERT`/`UPDATE`/`DELETE` must be rejected with 401/403.
> - Authenticated non-admin users attempting mutations or draft reads must be rejected with 403 / empty sets.
> - Public endpoints must be empirically verified to return 404 on drafts.
