-- Seed Fixtures: supabase/seed.sql
-- Description: Deterministic sample data for local development and integration testing.
-- STRICTLY FOR LOCAL ENVIRONMENT USE. NEVER APPLY TO HOSTED OR PRODUCTION ENVIRONMENTS.

-- 1. Insert published showcase project (RLS test fixture)
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
) ON CONFLICT (id) DO NOTHING;

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
) ON CONFLICT (id) DO NOTHING;

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
) ON CONFLICT (id) DO NOTHING;

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
) ON CONFLICT (id) DO NOTHING;

-- 5. Insert showcase project: BornoMala (বর্ণমালা)
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
  'f4f20867-4ad1-4d7e-89d0-15f08f14d94c',
  'BornoMala (বর্ণমালা)',
  'bornomala',
  'An offline-first Bangla input platform built around a shared Rust engine, supporting phonetic transliteration and National, Probhat, and Bijoy keyboard layouts. Integrates a Windows Text Services Framework (TSF) in-process IME, a Linux Fcitx 5 addon (partially verified under WSL2), and a Tauri desktop configuration interface.',
  'Multi-platform Bangla typing frequently relies on fragmented tools with disparate transliteration rules, complex input-method installation, and inconsistent desktop integration.',
  'Engineered a shared Rust core for phonetic and fixed-layout composition, bridging to native Windows TSF and Linux Fcitx 5 with a Tauri v2 desktop companion app.',
  'Delivered an offline-first input platform unifying 265 core unit tests, native Windows TSF text composition, and multi-layout transliteration.',
  ARRAY['Rust', 'C++', 'Windows TSF', 'Linux Fcitx 5', 'Tauri', 'TypeScript', 'Unicode'],
  'https://github.com/asmkhalid111/BornoMala',
  NULL,
  true,
  'published',
  10
) ON CONFLICT (id) DO NOTHING;

-- 6. Insert showcase project: BanglaScript Compiler
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
  'efa902ed-0182-406a-a4a0-2a93e0221b18',
  'BanglaScript Compiler',
  'banglascript-compiler',
  'A bilingual programming-language interpreter supporting both Bangla and English keywords. Developed with Flex for lexical analysis, Bison for parsing, and a C++ Abstract Syntax Tree evaluator supporting variables, user input, conditionals, and loops.',
  'Introductory programming languages typically mandate English syntax, limiting pedagogical exploration of programming concepts expressed natively in Bangla keywords.',
  'Constructed a bilingual grammar specification with Flex tokenization, Bison LALR parsing, and a recursive C++ Abstract Syntax Tree evaluator supporting variables, arithmetic, conditionals, and loops.',
  'Delivered a command-line language interpreter capable of parsing and executing bilingual programs across Windows (MSYS2) and Linux (WSL).',
  ARRAY['C++', 'Flex', 'Bison', 'Lexical Analysis', 'Parsing', 'Abstract Syntax Tree'],
  'https://github.com/asmkhalid111/Bangla-Compiler-Project',
  NULL,
  false,
  'published',
  20
) ON CONFLICT (id) DO NOTHING;

-- 7. Insert showcase project: Web-LAN-Chat
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
  '9ec56d14-b671-4608-9ff0-1c8a2da6446a',
  'Web-LAN-Chat',
  'web-lan-chat',
  'A browser-based real-time chat application designed for Local Area Networks (LAN). Built with Python, FastAPI WebSockets, SQLite persistence, and Tailwind CSS, featuring user accounts, persistent message history, and automated testing.',
  'Local network environments such as university labs or offline events require instant messaging capabilities without relying on external internet connectivity or cloud servers.',
  'Engineered a FastAPI backend utilizing native WebSockets for broadcast communication, SQLite with SQLAlchemy for message persistence, and bcrypt password hashing. Authored unit, integration, and Selenium browser UI test suites.',
  'Constructed an offline LAN chat application with real-time delivery, persistent chat rooms, glassmorphism UI, and automated regression test coverage.',
  ARRAY['Python', 'FastAPI', 'WebSockets', 'SQLite', 'SQLAlchemy', 'Selenium', 'Pytest', 'Tailwind CSS'],
  'https://github.com/asmkhalid111/Web-Lan-Chat',
  NULL,
  false,
  'published',
  30
) ON CONFLICT (id) DO NOTHING;
