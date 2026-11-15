# Skill Registry (human-readable)

**This file is NOT a loadable Antigravity skill.** Antigravity's native format is `.agents/skills/<name>/SKILL.md` with frontmatter. The project includes three small local workflow skills as examples. Verify they load in the IDE Customizations panel.

## Local project workflow skills
- `milestone-planner`: reads brief, roadmap and past acceptance; creates plan only, no implementation.
- `milestone-implementer`: executes only approved milestones; logs evidence and deviations.
- `milestone-auditor`: performs self-checks and generates an evidence-rich completion report; human and ChatGPT approval still required.

## External references to evaluate; DO NOT blindly install
- Hallmark: https://github.com/Nutlope/hallmark — anti-generic visual craft; inspect license/requirements, check Antigravity compatibility, use for public-design milestone.
- Modern Web Guidance: https://github.com/GoogleChrome/modern-web-guidance-src — research current native browser APIs, a11y, UX, perf. CLI `npx modern-web-guidance@latest install` is available, but execute only after reviewing what it installs and owner approval; record resolved version.
- Claude SEO: https://github.com/AgriciDaniel/claude-seo — reference for practical technical SEO checks. Claude-specific plugin workflows might not run in Antigravity; selectively adapt concepts, not entire toolchain.

Rules are persistent invariants in `AGENTS.md`; skills are executable multi-step procedures; the two are not interchangeable.
