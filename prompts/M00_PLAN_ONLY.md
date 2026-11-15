# Send this prompt to Antigravity — M00 PLAN ONLY

You are the implementation planner in a three-party workflow: owner approves; ChatGPT reviews architecture and acceptance evidence; you plan/implement/test only within approved milestone scope. The academic goal is a distinctive personal software engineering portfolio with a secure CRUD admin panel. Do not make this a generic landing page. Deployment must be early, on a free personal/noncommercial tier when permissible.

MODE: PLAN ONLY. DO NOT install packages, modify/create files, clone repositories, change accounts, commit, push, provision services or deploy. Read-only inspection and harmless local version checks are permitted. Do not execute remote code. If a check requires permissions or creates files, state it as a proposed command, do not run it.

PROJECT EVIDENCE (CV is outdated): Student CSE at Daffodil International University per CV dated Oct 3, 2026; past Java internship Codveda; project examples Web-LAN-Chat (FastAPI/WebSockets/SQLite/testing), BanglaScript Compiler (Flex/Bison), Clean Later extension (Manifest V3), ongoing ML tumor-grade research. Personal GitHub: https://github.com/asmkhalid111. These are candidate facts needing owner validation; do not publish phone number, references, unapproved résumé or fabricate metrics.

PROPOSED STACK (challenge if necessary): stable Next.js App Router + TypeScript strict + Tailwind CSS + Zod; Supabase PostgreSQL/Auth/Storage; Vercel Hobby with usage/non-commercial limits; Vitest + Playwright + GitHub Actions. Avoid separate backend/microservices. Implement a working deployed shell by M01 and first full projects CRUD vertical slice by M04.

EXTERNAL REFERENCE REPOS — research read-only, assess integration, maintenance, licensing and actual Antigravity compatibility, do not install or clone without approval:
1. https://github.com/Nutlope/hallmark — design principles, tokens, audit/anti-slop guidelines.
2. https://github.com/GoogleChrome/modern-web-guidance-src — modern native browser standards, performance and accessibility; check the latest command instructions.
3. https://github.com/AgriciDaniel/claude-seo — useful technical SEO subset; Claude-specific procedures may be inapplicable.
Official Antigravity rules: https://antigravity.google/docs/rules/
Official Antigravity skills: https://antigravity.google/docs/skills/

PROPOSED GOVERNANCE: root `AGENTS.md`; native skills `.agents/skills/<name>/SKILL.md`; `docs/{PROJECT_BRIEF,ROADMAP,ARCHITECTURE,DESIGN,SKILLS,MEMORY,ERRORS,DECISIONS,CONTENT_INVENTORY,SECURITY,TESTING}.md`; per-milestone `docs/milestones/Mxx-name/{PLAN,COMPLETION}.md`; prompt archive `prompts/`. The root `SKILLS.md` may be a human-readable index, but Antigravity will not load it as an executable skill. Avoid redundant rule duplication. Keep CV/private files out of public Git by default.

ROADMAP TO EVALUATE: M00 governance, M01 tooling+scaffold+first deploy, M02 DB/content model+RLS, M03 admin auth, M04 project CRUD+public project pages, M05 public design, M06 other content CRUD, M07 media/content polish, M08 SEO/a11y/perf, M09 security/CI/recovery, M10 final demo+documentation. Respect grading priority and manageable scope. Challenge bad dependencies.

TASK: 1) Inspect current workspace and tool versions read-only; differentiate observed from assumed. 2) Compare stack/hosting alternatives with cost/free limitations, implementation complexity and risk. 3) Give exact M00 governance outputs and proposed file tree, plus long-term source tree. 4) Define admin permissions, RLS approach and initial data model. 5) Propose read-only setup checks and later implementation commands with Windows PowerShell alternatives if relevant. 6) Review third-party references, whether they work directly in Antigravity, and where concepts can be adapted. 7) List M00 tests/acceptance conditions and next milestone gating. 8) Identify questions that materially block implementation, but provide safe defaults for non-blockers.

OUTPUT: A single structured **M00 IMPLEMENTATION PLAN** with architecture decision table, exact directories, risks, test/verification commands, deployment strategy and acceptance checklist. Clearly mark PLAN ONLY / NOTHING CHANGED, cite current official documentation for claims, and end with 'Ready for ChatGPT review; implementation not started'. DO NOT write code.
