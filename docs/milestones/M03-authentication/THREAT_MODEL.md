# Milestone M03 Threat Model & Security Boundaries

> **Document:** `docs/milestones/M03-authentication/THREAT_MODEL.md`<br>
> **Milestone:** M03 — Administrator Identity & Auth Boundaries<br>
> **Version:** v1.0 (Gate A Security Design)<br>
> **Date:** 2026-11-18<br>
> **Methodology:** STRIDE + Defense-in-Depth Trust Boundary Analysis

---

## 1. System Trust Boundaries

The M03 architecture establishes six distinct trust boundaries. Data crossing any boundary must be validated, sanitized, and authenticated:

```
[ Untrusted Client / Browser ]
           │
  ═════════╪══════════════════════════════════════════════════════════════════════ [ Boundary 1: Network & TLS ]
           ▼
[ Next.js 16 Edge Proxy (`src/proxy.ts`) ]
           │
  ═════════╪══════════════════════════════════════════════════════════════════════ [ Boundary 2: Edge to Server ]
           ▼
[ Next.js Server Components & Server Actions ]
           │
           ├───► [ Supabase Auth / GoTrue Service (JWT & Sessions) ] ════════════ [ Boundary 3: Auth Provider ]
           │
  ═════════╪══════════════════════════════════════════════════════════════════════ [ Boundary 4: Data API (PostgREST) ]
           ▼
[ PostgREST Data API (`/rest/v1`) ]
           │
  ═════════╪══════════════════════════════════════════════════════════════════════ [ Boundary 5: Database Engine ]
           ▼
[ PostgreSQL Kernel & RLS (Schema `public`) ]
           │
  ═════════╪══════════════════════════════════════════════════════════════════════ [ Boundary 6: Private Security Domain ]
           ▼
[ Isolated Administrator Whitelist (Schema `private.admin_users`) ]
```

---

## 2. Comprehensive Threat Analysis Matrix

The following matrix documents each threat vector following the required structure:
**Threat $\rightarrow$ Exploit Path $\rightarrow$ Security Boundary $\rightarrow$ Mitigation $\rightarrow$ Required Test $\rightarrow$ Residual Risk**.

| # | Threat | Exploit Path | Security Boundary | Mitigation Strategy | Required Test | Residual Risk |
|:---:|:---|:---|:---:|:---|:---:|:---|
| **T-01** | **Unauthenticated Access to Admin UI** | Visitor directly requests `/admin` or `/admin/dashboard` in browser | Boundary 1 & 2 | Proxy checks session; immediately redirects to `/admin/login`. Server component layout independently calls `getUser()`. | `AUTH-01` | Low: Network latency on redirect. |
| **T-02** | **Authenticated Non-Admin Privilege Escalation** | Legitimate user creates basic account, authenticates, and attempts to access `/admin` | Boundary 2 & 5 | Server component layout invokes `public.is_admin()`. When `false`, returns HTTP 404 (concealing admin routes). | `AUTH-04` | None: Database enforces whitelist check. |
| **T-03** | **Invited User Premature Admin Access** | Invited user accepts email link, sets password, but is not yet added to `private.admin_users` | Boundary 5 & 6 | Setup route redirects to `/auth/pending-approval`. Admin layout rejects with 404 until owner executes SQL whitelist insertion. | `AUTH-03`, `AUTH-16` | None: Decoupled onboarding state machine. |
| **T-04** | **Client-Side Cookie Tampering** | Attacker edits local session cookies in browser dev tools to inject fake `sub` or `role` claim | Boundary 2 & 3 | Proxy and Server Components invoke `supabase.auth.getUser()`, which validates JWT signature against Supabase Auth. Tampered cookie is rejected. | `AUTH-07` | None: Cryptographic signature verification. |
| **T-05** | **Expired JWT Replay Attack** | Attacker intercepts or captures an expired JWT and replays it against `/admin` endpoints | Boundary 3 | Proxy detects expiration and attempts refresh. If refresh token is expired or revoked, session is cleared and user is redirected to login. | `AUTH-08` | Minimal: Short-lived access token window (3600s). |
| **T-06** | **Session Hijacking / Theft** | Attacker steals active session cookies from victim's machine | Boundary 1 | Cookies configured as `HttpOnly`, `Secure`, `SameSite: Lax`. IP/User-Agent rotation triggers GoTrue token refresh security. | `AUTH-13` | Low: Mitigated by HTTPS and HttpOnly cookies. |
| **T-07** | **Open Redirect Phishing** | Attacker creates link `https://app/auth/callback?next=https://evil.com` to steal user tokens | Boundary 1 & 2 | Callback route strictly validates `next` parameter against internal relative path whitelist. Rejects `//` and external domains. | `AUTH-12` | None: Strict relative path validation. |
| **T-08** | **Invitation Token Replay / Reuse** | Attacker intercepts an invitation link and attempts to replay it after initial use | Boundary 3 | GoTrue marks one-time tokens as used immediately upon exchange. Replay attempt returns invalid/expired error. | `AUTH-11` | None: Single-use cryptographic tokens. |
| **T-09** | **Callback Parameter Manipulation** | Attacker strips `code` or `token_hash` from callback URL or injects malformed parameters | Boundary 2 | Callback handler inspects parameter presence; missing or malformed parameters trigger immediate redirect to `/auth/error`. | `AUTH-09`, `AUTH-10` | None: Fail-closed validation. |
| **T-10** | **Client-Side Admin Role Spoofing** | Attacker modifies React state, localStorage, or DOM variables to pretend to be admin | Boundary 2 & 4 | Server Components and Server Actions ignore all client-supplied role flags; identity is derived exclusively from verified JWT context. | `AUTH-22` | None: Server-authoritative architecture. |
| **T-11** | **Direct Mutation Endpoint Invocation** | Attacker bypasses UI and calls Server Actions or API routes directly via `curl`/`fetch` | Boundary 2, 4 & 5 | Every Server Action independently verifies `is_admin()`. PostgREST queries are subject to PostgreSQL RLS kernel policies. | `AUTH-06`, `AUTH-22` | None: Kernel RLS enforces check. |
| **T-12** | **PostgreSQL RLS Bypass** | Attacker attempts to query `public.projects` drafts or mutate rows via REST API | Boundary 4 & 5 | `FORCE ROW LEVEL SECURITY` is active. Public policies restrict drafts; mutation policies evaluate `private.is_admin()`. | `AUTH-06`, `AUTH-20` | None: Verified in M02 (46/46 tests). |
| **T-13** | **RPC Parameter Injection on `is_admin`** | Attacker calls `supabase.rpc('is_admin', { user_id: 'target' })` to test another user's status | Boundary 4 & 5 | Function signature takes **zero arguments** (`() RETURNS boolean`). It derives identity exclusively from `auth.uid()`. | `AUTH-23` | None: Parameterless function signature. |
| **T-14** | **Anonymous RPC Probing** | Unauthenticated attacker calls `public.is_admin()` repeatedly to probe database status | Boundary 4 | `REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;` ensures anon calls fail immediately with permission denied. | `AUTH-24` | None: Execution privileges revoked. |
| **T-15** | **Service-Role Credential Leakage** | Developer accidentally references `SUPABASE_SERVICE_ROLE_KEY` in frontend code | Boundary 1 | Service-role key is omitted from `.env.local` and `NEXT_PUBLIC_` namespaces. Automated secret scan enforces exclusion. | `AUTH-19` | Low: CI/Local secret scanner active. |
| **T-16** | **Cross-User SSR Cache Leakage** | Next.js or CDN caches authenticated admin responses and serves them to public visitors | Boundary 1 & 2 | Proxy and layout inject `Cache-Control: private, no-store, must-revalidate` on all `/admin` and `/auth` routes. | `AUTH-18` | None: Explicit private no-store headers. |
| **T-17** | **Password Recovery Account Enumeration** | Attacker enters random emails on `/auth/forgot-password` to discover admin address | Boundary 1 & 2 | Endpoint always returns generic message: *"If an account exists, a recovery link has been dispatched."* Status code is 200. | `AUTH-15` | Low: Minimal timing variance mitigated by GoTrue. |
| **T-18** | **Infinite Redirect Loop** | Expired session or misconfigured route causes `/admin` <-> `/admin/login` infinite redirect loop | Boundary 2 | State machine design: `/admin/login` never redirects to itself; expired session clears cookies before redirecting. | `AUTH-21` | None: Deterministic state machine. |
| **T-19** | **Immediate Administrator Revocation** | Owner deletes administrator from `private.admin_users`; user still has valid 1-hour JWT | Boundary 5 | `public.is_admin()` queries live database table on every Server Action and layout render. Revocation is instantaneous. | `AUTH-17` | None: Real-time DB lookup overrides JWT expiry. |
| **T-20** | **Supabase Auth Outage / Timeout** | GoTrue auth service is unreachable due to upstream network issue | Boundary 3 | Code wraps auth calls in try-catch; fails closed, clears active session state, and redirects to `/auth/error?error=service_unavailable`. | `AUTH-25` | Low: Degraded availability, but zero security breach. |

---

## 3. Defense-in-Depth Summary

1. **No Single Point of Failure:** Breaching Proxy only lands the attacker at the Server Component. Breaching the Server Component only exposes UI, while PostgreSQL RLS blocks data mutations.
2. **Fail-Closed by Default:** Any missing parameter, unverified JWT, unconfirmed email, or database error denies access unconditionally.
3. **Zero Secret Key Reliance:** All client-side and server-side communications operate through the public publishable key paired with authenticated JWTs. The service-role key is completely absent.
