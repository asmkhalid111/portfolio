# Milestone M03 Threat Model & Security Boundaries

> **Document:** `docs/milestones/M03-authentication/THREAT_MODEL.md`<br>
> **Milestone:** M03 — Administrator Identity & Auth Boundaries<br>
> **Version:** v1.1 (Gate A.1 Security Reconciliation)<br>
> **Date:** 2026-11-18<br>
> **Methodology:** STRIDE + Defense-in-Depth Trust Boundary Analysis

---

## Revision History

| Version | Date | Author | Summary of Changes | Status |
|:---:|:---:|:---|:---|:---:|
| **v1.0** | 2026-11-18 | Principal Next.js Architect | Initial Gate A threat model covering 20 threat vectors across 6 boundaries. | Superseded |
| **v1.1** | 2026-11-18 | Principal Next.js Architect | **Gate A.1 Security Reconciliation:** Reconciled SSR non-HttpOnly cookie model with dedicated XSS threat analysis; replaced inaccurate "zero residual risk" claims with realistic risk assessments; updated RPC parameter injection to document PostgREST rejection; clarified local vs global sign-out and stateless JWT expiration vs live database whitelist revocation; decoupled test references from M04. | Current (Pass with Conditions) |

---

## 1. System Trust Boundaries

The M03 architecture establishes six distinct trust boundaries. Data crossing any boundary must be validated, sanitized, and authenticated:

```
[ Untrusted Client / Browser ]
           │
  ═════════╪══════════════════════════════════════════════════════════════════════ [ Boundary 1: Network & TLS ]
           ▼
[ Next.js 16 Node.js Proxy (`src/proxy.ts`) ]
           │
  ═════════╪══════════════════════════════════════════════════════════════════════ [ Boundary 2: Proxy to Server ]
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
| **T-01** | **Unauthenticated Access to Admin UI** | Visitor directly requests `/admin` or `/admin/dashboard` in browser | Boundary 1 & 2 | Proxy checks session via `getUser()`; immediately redirects unauthenticated requests to `/admin/login`. Server component layout independently verifies session. | `AUTH-01` | **Low:** Minor network timing variance on initial redirect; zero access to data. |
| **T-02** | **Authenticated Non-Admin Privilege Escalation** | Legitimate user creates basic account, authenticates, and attempts to access `/admin` | Boundary 2 & 5 | Server component layout invokes `public.is_admin()`. When `false`, returns HTTP 404 (concealing admin routes). PostgREST RLS blocks underlying data. | `AUTH-04` | **Low:** Server executes one database lookup per request; zero privilege leak. |
| **T-03** | **Invited User Premature Admin Access** | Invited user accepts email link, sets password, but is not yet added to `private.admin_users` | Boundary 5 & 6 | Setup route redirects to `/auth/pending-approval`. Admin layout and actions reject with 404 until owner executes SQL whitelist insertion. | `AUTH-03`, `AUTH-16` | **Low:** User sees safe pending approval view; zero admin access granted. |
| **T-04** | **Client-Side Cookie Tampering** | Attacker edits local session cookies in browser dev tools to inject fake `sub` or `role` claim | Boundary 2 & 3 | Proxy and Server Components invoke `supabase.auth.getUser()`, which validates cryptographic JWT signature with GoTrue. Tampered cookies are rejected. | `AUTH-07` | **Low:** Dependent on upstream GoTrue secret integrity; local modifications fail signature check. |
| **T-05** | **Expired JWT Replay Attack** | Attacker intercepts an expired JWT and replays it against `/admin` endpoints | Boundary 3 | Proxy detects expiration and attempts refresh. If refresh token is expired or revoked, session is cleared and user is redirected to login. | `AUTH-08` | **Low:** Replay window strictly bounded by short-lived access token TTL (typically 3600s). |
| **T-06** | **Session Hijacking via Stolen Cookies / XSS** | Attacker reads session cookies from browser via XSS and makes authenticated requests | Boundary 1 & 2 | Note: `@supabase/ssr` cookies are **not** `HttpOnly` because `createBrowserClient` must read them. Primary defense is strict Content Security Policy (`script-src 'self'`), React 19 auto-escaping, prohibition of `dangerouslySetInnerHTML`, and `Secure` flag on HTTPS. | `AUTH-13`, `AUTH-19` | **Medium/Low:** Mitigated by strict CSP and lack of inline scripts; XSS execution would expose active tokens until revoked. |
| **T-07** | **Open Redirect Phishing** | Attacker crafts link `https://app/auth/callback?next=https://evil.com` to steal user tokens | Boundary 1 & 2 | Callback route strictly validates `next` parameter against internal relative path whitelist. Rejects `//`, `\`, and external domains. Falls back to safe default. | `AUTH-12` | **Low:** Strict regex and relative path check prevents external redirection. |
| **T-08** | **Invitation Token Replay / Reuse** | Attacker intercepts an invitation link and attempts to replay it after initial use | Boundary 3 | GoTrue marks one-time invitation tokens as consumed immediately upon first exchange. Subsequent attempts return invalid/expired error. | `AUTH-11` | **Low:** Dependent on GoTrue single-use token lifecycle enforcement. |
| **T-09** | **Callback Parameter Manipulation** | Attacker strips `code` or `token_hash` from callback URL or injects malformed parameters | Boundary 2 | Callback handler inspects parameter presence; missing or malformed parameters trigger immediate redirect to `/auth/error?error=missing_parameters`. | `AUTH-09`, `AUTH-10` | **Low:** Fail-closed validation drops unverified requests safely. |
| **T-10** | **Client-Side Admin Role Spoofing** | Attacker modifies React state, localStorage, or DOM variables to pretend to be admin | Boundary 2 & 4 | Server Components and Server Actions ignore all client-supplied role flags; identity is derived exclusively from verified JWT context and database whitelist. | `AUTH-22` | **Low:** Client-side UI modifications cannot alter server-side or database checks. |
| **T-11** | **Direct Mutation Endpoint Invocation** | Attacker bypasses UI and calls Server Actions or API routes directly via `curl`/`fetch` | Boundary 2, 4 & 5 | Every Server Action independently verifies `public.is_admin()`. PostgREST queries are subject to PostgreSQL RLS kernel policies. Tested in M03 via `testAdminAction`. | `AUTH-06`, `AUTH-22` | **Low:** Kernel RLS enforces policy even if application layer were compromised. |
| **T-12** | **PostgreSQL RLS Bypass** | Attacker attempts to query `public.projects` drafts or mutate rows via REST API | Boundary 4 & 5 | `FORCE ROW LEVEL SECURITY` is active. Public policies restrict drafts; mutation policies evaluate `private.is_admin()`. | `AUTH-06`, `AUTH-20` | **Low:** Verified in M02 (46/46 tests); enforced at database engine level. |
| **T-13** | **RPC Parameter Injection on `is_admin`** | Attacker calls `supabase.rpc('is_admin', { user_id: 'target' })` to test another user's status | Boundary 4 & 5 | Function signature takes **zero arguments** (`() RETURNS boolean`). PostgREST rejects calls containing unexpected arguments with `PGRST202` / argument mismatch error. | `AUTH-23` | **Low:** PostgREST strict signature matching rejects unknown parameter signatures. |
| **T-14** | **Anonymous RPC Probing** | Unauthenticated attacker calls `public.is_admin()` repeatedly to probe database status | Boundary 4 | `REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;` ensures anon calls fail immediately with permission denied. | `AUTH-24` | **Low:** PostgreSQL catalog permission checks reject execution at call boundary. |
| **T-15** | **Service-Role Credential Leakage** | Developer accidentally references `SUPABASE_SERVICE_ROLE_KEY` in frontend code | Boundary 1 | Service-role key is omitted from `.env.local` and `NEXT_PUBLIC_` namespaces. Automated secret scan enforces exclusion. | `AUTH-19` | **Low:** CI/Local secret scanner and environment discipline mitigate risk. |
| **T-16** | **Cross-User SSR Cache Leakage** | Next.js or CDN caches authenticated admin responses and serves them to public visitors | Boundary 1 & 2 | Proxy and layout inject `Cache-Control: private, no-store, must-revalidate` on all `/admin` and `/auth` routes. | `AUTH-18` | **Low:** Browser and CDN adhere to strict private no-store cache directives. |
| **T-17** | **Password Recovery Account Enumeration** | Attacker enters random emails on `/auth/forgot-password` to discover admin address | Boundary 1 & 2 | Endpoint always returns generic message: *"If an account exists, a recovery link has been dispatched."* Status code is 200. | `AUTH-15` | **Low:** Subtle timing differences in GoTrue SMTP dispatch may exist; minimized by generic UI response. |
| **T-18** | **Infinite Redirect Loop** | Expired session or misconfigured route causes `/admin` <-> `/admin/login` infinite redirect loop | Boundary 2 | State machine design: `/admin/login` never redirects to itself; expired session clears cookies before redirecting; proxy handles redirects deterministically. | `AUTH-21` | **Low:** Deterministic state machine prevents circular routing transitions. |
| **T-19** | **Delayed Administrator Revocation** | Owner deletes administrator from `private.admin_users`; user still has valid 1-hour JWT | Boundary 5 | `public.is_admin()` queries live database table on every Server Action and layout render. Administrative access is revoked immediately on next request. | `AUTH-17` | **Low:** The user retains a valid unprivileged GoTrue session until JWT expires or refresh token is revoked, but all admin rights cease instantly. |
| **T-20** | **Supabase Auth Outage / Timeout** | GoTrue auth service is unreachable due to upstream network issue | Boundary 3 | Code wraps auth calls in try-catch; fails closed, clears active session state, and redirects to `/auth/error?error=service_unavailable`. | `AUTH-25` | **Low:** Temporary availability degradation; zero unauthorized access or data exposure. |
| **T-21** | **Cross-Site Scripting (XSS) Token Exfiltration** | Attacker injects malicious script into page to read non-HttpOnly `@supabase/ssr` cookies | Boundary 1 | Mitigated by strict CSP (`script-src 'self'`), React 19 automatic output escaping, complete prohibition of `dangerouslySetInnerHTML`, and strict dependency hygiene. | `AUTH-19` | **Medium/Low:** In the unlikely event of an XSS vulnerability, non-HttpOnly tokens could be read; defense relies on strict prevention of script injection. |

---

## 3. Defense-in-Depth Summary

1. **No Single Point of Failure:** Breaching Proxy only lands the attacker at the Server Component. Breaching the Server Component only exposes UI layout, while PostgreSQL RLS blocks data mutations at the database kernel.
2. **Fail-Closed by Default:** Any missing parameter, unverified JWT, unconfirmed email, or database error denies access unconditionally.
3. **Zero Secret Key Reliance:** All client-side and server-side communications operate through the public publishable key paired with authenticated JWTs. The service-role key is completely absent.
4. **Realistic Residual Risk Acknowledgment:** While security boundaries are enforced across all tiers, residual risks such as GoTrue token TTL windows and non-HttpOnly cookie exposure to hypothetical XSS are transparently documented and mitigated by defense-in-depth controls.
