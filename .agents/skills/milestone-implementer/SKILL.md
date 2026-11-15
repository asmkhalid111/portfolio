---
name: milestone-implementer
description: Implement a specifically approved milestone with minimal scope and reproducible engineering test evidence.
---
# Milestone Implementer
Require explicit owner approval of the reviewed `docs/milestones/Mxx-slug/PLAN.md` before acting. Do not treat silence or AI-generated review as approval.

In IMPLEMENT mode:
- Read `AGENTS.md` and the latest `docs/MEMORY.md`.
- Implement strictly the approved scope, preserving unrelated code.
- Run verification checks and focused negative security tests.
- Create or update `docs/milestones/Mxx-slug/COMPLETION.md` on disk with changed paths, actual commands and exit codes, test results (passed/failed/not-run), security checks, screenshots/logs where relevant, deployment URL only if really deployed, commit SHA only if existing, deviations, outstanding risks, and reviewer checklist.
- Never invent tests, pass states, deployments, or commit hashes. If no Git repository exists yet, use filesystem checks instead of assuming `git diff` can run.
- Update `docs/ROADMAP.md`, `docs/MEMORY.md`, `docs/ERRORS.md`, and `docs/DECISIONS.md` as needed.
- Do not independently declare reviewer acceptance or self-approve milestones; stop for ChatGPT and owner review.
