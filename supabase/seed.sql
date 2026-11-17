-- Seed Fixtures: supabase/seed.sql
-- Description: Deterministic sample data for local development and integration testing.
-- STRICTLY FOR LOCAL ENVIRONMENT USE. NEVER APPLY TO HOSTED OR PRODUCTION ENVIRONMENTS.

-- 1. Insert published showcase project
INSERT INTO public.projects (
  id,
  title,
  slug,
  summary,
  problem,
  approach,
  outcome,
  technologies,
  repository_url,
  live_demo_url,
  featured,
  status,
  sort_order
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Distributed Task Orchestrator',
  'distributed-task-orchestrator',
  'A fault-tolerant distributed execution engine coordinating asynchronous agentic workloads across edge nodes.',
  'Large-scale agentic workflows required reliable job scheduling with sub-second failover and partitioned state tracking.',
  'Engineered a deterministic state machine using PostgreSQL advisory locks and distributed consensus.',
  'Achieved 99.99% workflow delivery reliability with zero message loss across synthetic network partitions.',
  ARRAY['TypeScript', 'PostgreSQL', 'Docker', 'Next.js'],
  'https://github.com/asmkhalid111/orchestrator-demo',
  'https://orchestrator-demo.example.com',
  true,
  'published',
  1
);

-- 2. Insert draft showcase project (must be hidden from anonymous visitors)
INSERT INTO public.projects (
  id,
  title,
  slug,
  summary,
  problem,
  approach,
  outcome,
  technologies,
  repository_url,
  live_demo_url,
  featured,
  status,
  sort_order
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Autonomous Code Auditor',
  'autonomous-code-auditor',
  'An offline static analysis pipeline enforcing milestone gates and security invariants for full-stack repositories.',
  'Manual security reviews often missed subtle search_path injection vulnerabilities in PostgreSQL triggers.',
  'Implemented AST parsing and SQL grammar inspection to detect privilege escalation vectors before commit.',
  'Identified and prevented 14 critical authorization regressions in synthetic benchmark suites.',
  ARRAY['TypeScript', 'Rust', 'PostgreSQL'],
  'https://github.com/asmkhalid111/code-auditor-draft',
  NULL,
  false,
  'draft',
  2
);

-- 3. Insert media attachments for published project
INSERT INTO public.project_media (
  id,
  project_id,
  storage_path,
  alt_text,
  caption,
  sort_order
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'projects/orchestrator/architecture-diagram.png',
  'Distributed Task Orchestrator high-level system architecture diagram',
  'Figure 1: Event-driven consensus architecture across edge worker nodes.',
  1
);

-- 4. Insert media attachments for draft project (must be hidden from anonymous visitors)
INSERT INTO public.project_media (
  id,
  project_id,
  storage_path,
  alt_text,
  caption,
  sort_order
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'projects/auditor/ast-pipeline.png',
  'Autonomous Code Auditor AST analysis pipeline preview',
  'Internal preview of the AST validation engine.',
  1
);
