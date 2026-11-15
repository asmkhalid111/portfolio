# Project Brief — v0.1 Draft

## Audience
Recruiters, professors, technical reviewers and collaborators. Secondary audience: nontechnical visitors who should understand the owner's work in under 30 seconds.

## Primary objective
Demonstrate evidence of engineering competence through real project case studies, links, stack descriptions, tested implementations, technical trade-offs and deployed work. Avoid a CV pasted into a site.

## Academic acceptance
Demonstrate an authenticated admin can Create, Read, Update and Delete portfolio records, with persistent changes visible in the public site according to draft/publish status. Non-admins must be blocked at UI, server and database levels.

## Public routes (proposed)
`/`, `/projects`, `/projects/[slug]`, `/about`, `/contact` (may be section instead of route), `/resume` (optional approved public asset).

## Protected routes (proposed)
`/admin/login`, `/admin`, `/admin/projects`, `/admin/projects/new`, `/admin/projects/[id]/edit`, `/admin/experience`, `/admin/skills`, `/admin/settings`.

## Scope exclusions unless approved
Blog, commenting, newsletter, payment, AI chatbot, separate backend service, realtime dashboards, elaborate CMS, multiple admin roles, complex animations, third-party analytics requiring consent, and unsupported degree/achievement claims.

## Privacy defaults
Name and public GitHub/LinkedIn are candidate public content. Do not publish a phone number, reference email, personal address, student identification, CV PDF, or research data without explicit approval. Contact e-mail also needs owner approval before publishing.
