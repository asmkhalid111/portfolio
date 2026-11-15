# Generic Antigravity implementation prompt

MODE: IMPLEMENT ONLY APPROVED [MILESTONE_ID]. Proceed ONLY after explicit owner approval of the reviewed plan `docs/milestones/[MILESTONE_ID]/PLAN.md` (version [VERSION]). Do not treat silence or AI review as approval.

Read root `AGENTS.md`, `MEMORY`, `ERRORS`, `DECISIONS`, and the complete approved plan first. Implement exactly approved scope, preserving unrelated code. Perform documented checks, add focused negative security tests, and confirm deployment/rollback where required. Never deploy, provision accounts, run destructive migrations, or expose credentials without explicit authorization.

Create or update `docs/milestones/[MILESTONE_ID]/COMPLETION.md` on disk with changed paths, actual commands and exit codes, test results (passed/failed/not-run), security checks, screenshots/logs where relevant, deployment URL only if really deployed, commit SHA only if existing, deviations, outstanding risks, and a reviewer checklist. Never invent tests, pass states, deployments, or commit hashes. If no Git repository exists yet, use filesystem checks instead of assuming `git diff` can run. Update durable docs. Stop for ChatGPT and owner audit; do not self-approve.
