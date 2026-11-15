# Milestone Documentation Template & Operating Rules

Use durable on-disk Markdown records: `docs/milestones/Mxx-slug/PLAN.md` and `docs/milestones/Mxx-slug/COMPLETION.md`. Do not replace evidence with descriptive prose. Chat output is only an index/summary; the durable on-disk artifact is the authoritative record.

## Operating Modes & Workflow Rules

- **PLAN mode:** Read-only for product code, tooling, infrastructure, credentials, and remote systems. Markdown planning artifacts ARE allowed when explicitly requested. For every milestone, create or update `docs/milestones/Mxx-slug/PLAN.md` as the full implementation plan on disk. Include the exact file path in the chat message. Planning must never create `COMPLETION.md` or mark a milestone complete. After writing, reopen/read the file to verify it is nonempty and complete. Status remains `AWAITING REVIEW` until the project owner explicitly authorizes implementation.
- **REVIEW/REVISION mode:** Incorporate ChatGPT and owner review feedback directly into the milestone's `PLAN.md`. Maintain a revision history table inside the document. Status remains `AWAITING REVIEW` until explicit owner sign-off. Do not treat silence or AI review as approval.
- **IMPLEMENT mode:** Proceed only after explicit owner approval of the reviewed `PLAN.md`. Implement only approved scope. Create or update `docs/milestones/Mxx-slug/COMPLETION.md` on disk with actual commands, exit codes, test outputs (passed/failed/not-run), security checks, screenshots/logs, deployment URL (only if deployed), and commit SHA (only if committed). Never invent tests, deployments, or commit hashes. If no Git repo exists yet, use filesystem checks instead of `git diff`.
- **AUDIT/REPAIR mode:** Any repairs update the relevant plan or append a dedicated repair section to `COMPLETION.md`, preserving readable audit history without unrelated changes.
- **Evidence Rule:** All mandated documentation artifacts must exist on disk and be read back before declaring success.

## PLAN.md Structure
- Title, Milestone ID, status (`AWAITING REVIEW` or `APPROVED`), date, agent
- Revision history table (version, date, author, summary of changes)
- Objective & relevance to academic grading
- Scope and explicit non-goals
- Preconditions and dependencies
- File-by-file additions/changes/deletions (tree and diff outline)
- Environment commands (read-only audit vs implementation)
- Data model, auth/RLS implications, API/route contract if relevant
- Security, accessibility, responsive behavior, measurable performance goals
- Acceptance criteria (observable and reproducible)
- Tests with exact proposed commands and test contracts
- Deployment, migration, and rollback implications (appropriate for tier)
- Risks, unknowns, and explicit decision checklist for owner approval

## COMPLETION.md Structure
- Milestone ID, approved plan reference (version/date), completion date, agent/model
- What actually changed with exact file paths
- Actual executed commands and exit codes (never claim tests ran without output)
- Test suite outcomes with passed / failed / not-run status
- Database migration and policy evidence if relevant
- Security verification and negative tests
- Deployed URL (only if actually deployed; omit or mark N/A if not deployed)
- Commit SHA, branch, and dirty-worktree status (or filesystem check if Git not yet initialized)
- Exceptions, plan deviations, incident IDs, and outstanding risks
- Live demonstration steps and reproduction instructions
- Reviewer checklist and recommendation (ready for external review, NOT self-approved)
