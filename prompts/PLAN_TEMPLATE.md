# Generic Antigravity planning prompt

MODE: PLAN ONLY — read-only for product code, tooling, infrastructure, credentials, and remote systems. Markdown planning artifacts ARE allowed when explicitly requested. Read root `AGENTS.md`, `docs/MEMORY.md`, `ROADMAP.md`, `DECISIONS.md`, `ERRORS.md`, latest accepted milestone, and current project filesystem/diff.

Goal: PLAN [MILESTONE_ID] only. Treat past plans as unapproved unless marked explicitly approved by owner. For every milestone, create or update `docs/milestones/[MILESTONE_ID]/PLAN.md` as the full implementation plan on disk. Include the exact file path in the final chat message. Planning must never create `COMPLETION.md` or mark the milestone complete.

Produce a comprehensive milestone plan containing scope/non-scope, exact file tree and diff intent, commands (differentiating audit from implementation), acceptance tests, security and privacy checks, risks, rollback strategy, deployment impact, and questions requiring owner approval. Validate up-to-date library API usage against official docs; distinguish observed from inferred and unverified facts. After writing, reopen and read the file to confirm it is nonempty and complete. Chat output is a summary/index of the real Markdown file, not its replacement. Status remains AWAITING REVIEW. End with plan ready for ChatGPT review. Do not implement.
