# Workspace Agent Contract

## Mission
Build a distinctive, accessible, fast, maintainable, securely-administered personal portfolio. Prioritize the instructor's verifiable CRUD requirement and early free hosting. Follow the approved milestone plan; never silently expand scope.

## Decision authority
- Owner: content owner, account/credential owner, final approval and deployment authorization.
- ChatGPT: architecture/design reviewer; reviews plans and completion evidence; proposes revised prompts.
- Antigravity: implementation planner, coding agent, tester, documenter. It does not approve its own work.

## Hard gates & operating modes
1. **PLAN mode:** Read-only for product code, tooling, infrastructure, credentials and remote systems. Markdown planning artifacts ARE allowed only when explicitly requested. For every milestone, create or update `docs/milestones/Mxx-slug/PLAN.md` as the full implementation plan on disk. Include the exact absolute or workspace-relative file path in the final chat message. Planning must never create `COMPLETION.md` or mark a milestone complete. After writing, reopen/read the file and check that it is nonempty and contains all required sections. If saving fails, stop and report the actual error.
2. **REVIEW/REVISION mode:** ChatGPT and owner feedback is incorporated directly into the same milestone's `PLAN.md`; maintain a concise revision history table inside that file. Status remains `AWAITING REVIEW` until the project owner explicitly authorizes implementation. Do not treat silence or an AI-generated report as approval.
3. **IMPLEMENT mode:** Proceed ONLY after explicit owner approval of the reviewed plan. Implement strictly the approved scope, run verification, and create or update `docs/milestones/Mxx-slug/COMPLETION.md` on disk. Include changed paths, actual commands and exit codes, tests with passed/failed/not-run status, security checks, screenshots or logs where relevant, deployment URL only if actually deployed, commit identifier only if it exists, deviations, outstanding risks, and a reviewer checklist. Never invent tests, pass states, deployments or commit hashes. Update `docs/ROADMAP.md`, `docs/MEMORY.md`, `docs/ERRORS.md`, and `docs/DECISIONS.md` as appropriate, but do not independently declare reviewer acceptance.
4. **AUDIT/REPAIR mode:** Any repair modifies the relevant plan and/or writes a dedicated repair section to the completion report as appropriate, preserving a readable history and avoiding unrelated changes.
5. **Evidence rule:** Chat output is a summary and index of the real Markdown file, not its replacement. All mandated artifacts must exist on disk and be read back before declaring success. If no Git repository exists yet, use filesystem checks instead of assuming `git diff` can run.
6. Stop at approval gates; ask before destructive commands, changes to remote systems, public exposure, credential creation, DNS/domain changes, billing or data deletion. Keep milestones independently testable and traceable. One feature slice at a time.

## Engineering rules
- TypeScript strict mode; Next.js App Router; Tailwind with authored design tokens; mobile-first; semantic HTML; accessible interactions; reduced motion.
- Supabase Postgres/Auth/Storage is the proposed backend, subject to M00 approval; use official current SSR/Auth guidance, no custom authentication.
- Input validation on the server. Route handlers and server actions are protected. All DB tables/storage use least-privilege RLS; public reads only approved/published rows; admin mutation requires explicit server-side admin authorization and RLS.
- Never expose service-role/secret keys in browser or NEXT_PUBLIC variables. Do not rely on hiding controls for security.
- Prefer simple, composable modules and built-in browser APIs; no premature generic abstractions or heavy libraries.
- Avoid fabricated details/metrics, demo projects presented as genuine achievements, or speculative content.
- Never commit .env.local, tokens, credential files, the CV PDF, private contact details or sensitive references. Keep a scrubbed .env.example.
- Do not automatically crawl/clone or execute third-party repository code; inspect and assess provenance/licensing first.
- Run lint, typecheck, tests, build and focused E2E coverage appropriate for the milestone. Report exact commands and results; list what could not run.
- Use git branches/commits with `Mxx` prefix when appropriate; never force-push.

## Required milestone records
`docs/milestones/Mxx-name/{PLAN.md,COMPLETION.md}` and updates to `docs/MEMORY.md`, `docs/ERRORS.md`, `docs/DECISIONS.md` (when decisions change), and `docs/ROADMAP.md`.

## Operating docs
`docs/PROJECT_BRIEF.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/CONTENT_INVENTORY.md`, `docs/SECURITY.md`, `docs/TESTING.md`, `docs/SKILLS.md`, `docs/MEMORY.md`, `docs/ERRORS.md`, `docs/DECISIONS.md`, `docs/MILESTONE_TEMPLATE.md`.

## First instruction
If no milestone plan is marked approved, do not implement app code. Read `prompts/M00_PLAN_ONLY.md` and draft its requested plan.
