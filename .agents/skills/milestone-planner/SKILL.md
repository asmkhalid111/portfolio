---
name: milestone-planner
description: Create evidence-based, approval-gated implementation plans for the portfolio project without making code or system changes.
---
# Milestone Planner
Read `AGENTS.md`, `docs/ROADMAP.md`, `docs/MEMORY.md`, `docs/DECISIONS.md`, `docs/ERRORS.md`, and relevant current implementation. Separate observed facts from assumptions and unverified items.

In PLAN mode:
- Read-only for product code, tooling, infrastructure, credentials, and remote systems. Markdown planning artifacts ARE allowed only when explicitly requested.
- For every milestone, create or update `docs/milestones/Mxx-slug/PLAN.md` as the full implementation plan on disk using the format in `docs/MILESTONE_TEMPLATE.md`.
- Include the exact absolute or workspace-relative file path in the final chat message.
- Planning must never create `COMPLETION.md` or mark a milestone complete.
- After writing, reopen/read the file and verify that it is nonempty and contains all required sections. If saving fails, stop and report the actual error.
- Status remains `AWAITING REVIEW` until the project owner explicitly authorizes implementation. Do not treat silence or AI review as approval. Return the plan to the owner for ChatGPT review and explicit approval.
