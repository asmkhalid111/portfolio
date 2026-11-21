import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Database } from '@/lib/supabase/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

// Mock project records for the four project archetypes
const MOCK_PROJECTS: Record<string, ProjectRow> = {
  bornomala: {
    id: 'f4f20867-4ad1-4d7e-89d0-15f08f14d94c',
    title: 'BornoMala (বর্ণমালা)',
    slug: 'bornomala',
    summary: 'An offline-first Bangla input platform built around a shared Rust engine.',
    problem: 'Multi-platform Bangla typing frequently relies on fragmented tools.',
    approach: 'Engineered a shared Rust core bridging to native Windows TSF and Linux Fcitx 5.',
    outcome: 'Delivered an offline-first input platform unifying 265 core unit tests.',
    technologies: ['Rust', 'C++', 'Windows TSF', 'Linux Fcitx 5', 'Tauri', 'Unicode'],
    repository_url: 'https://github.com/asmkhalid111/BornoMala',
    live_demo_url: null,
    featured: true,
    status: 'published',
    sort_order: 10,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    published_at: '2026-01-01T00:00:00Z',
    created_by: null,
  },
  'banglascript-compiler': {
    id: 'efa902ed-0182-406a-a4a0-2a93e0221b18',
    title: 'BanglaScript Compiler',
    slug: 'banglascript-compiler',
    summary: 'A bilingual programming-language interpreter supporting both Bangla and English keywords.',
    problem: 'Introductory programming languages typically mandate English syntax.',
    approach: 'Constructed a bilingual grammar specification with Flex tokenization and Bison parsing.',
    outcome: 'Delivered a command-line language interpreter parsing bilingual programs.',
    technologies: ['C++', 'Flex', 'Bison', 'Lexical Analysis', 'Parsing'],
    repository_url: 'https://github.com/asmkhalid111/Bangla-Compiler-Project',
    live_demo_url: null,
    featured: false,
    status: 'published',
    sort_order: 20,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    published_at: '2026-01-01T00:00:00Z',
    created_by: null,
  },
  'web-lan-chat': {
    id: '9ec56d14-b671-4608-9ff0-1c8a2da6446a',
    title: 'Web-LAN-Chat',
    slug: 'web-lan-chat',
    summary: 'A browser-based real-time chat application designed for Local Area Networks (LAN).',
    problem: 'Local network environments require messaging without internet connectivity.',
    approach: 'Engineered a FastAPI backend utilizing native WebSockets and SQLite persistence.',
    outcome: 'Constructed an offline LAN chat application with automated regression tests.',
    technologies: ['Python', 'FastAPI', 'WebSockets', 'SQLite', 'Pytest', 'Tailwind CSS'],
    repository_url: 'https://github.com/asmkhalid111/Web-Lan-Chat',
    live_demo_url: null,
    featured: false,
    status: 'published',
    sort_order: 30,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    published_at: '2026-01-01T00:00:00Z',
    created_by: null,
  },
  'clean-later': {
    id: '77777777-7777-7777-7777-777777777777',
    title: 'Clean Later',
    slug: 'clean-later',
    summary: 'A minimalist Chrome extension for managing temporary tabs and bookmark hygiene.',
    problem: 'Tab hoarding causes memory bloat and cognitive friction during research.',
    approach: 'Engineered a lightweight Manifest V3 Chrome extension with zero background listeners.',
    outcome: 'Achieved instant one-click tab clearing with storage-safe session persistence.',
    technologies: ['JavaScript', 'Chrome Extension API', 'HTML5', 'CSS'],
    repository_url: 'https://github.com/asmkhalid111/clean-later',
    live_demo_url: null,
    featured: false,
    status: 'draft',
    sort_order: 40,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    published_at: null,
    created_by: null,
  },
};

describe('Task 12E: Four-Project Generic Case-Study Validation Suite', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('CASE_STUDY_PREVIEW_ENABLED', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function setupEnvironment(
    currentSlug: string,
    githubResultOverride?: Record<string, unknown>,
    mediaRowsOverride: Array<Record<string, unknown>> = []
  ) {
    const project = MOCK_PROJECTS[currentSlug];

    vi.doMock('@/lib/auth/admin', () => ({
      getAdminAuthStatus: vi.fn().mockResolvedValue({
        isAdmin: true, // Allow draft preview for clean-later control
        user: { id: 'admin-1', email: 'admin@portfolio.local' },
        error: null,
      }),
    }));

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        from: (table: string) => {
          if (table === 'projects') {
            return {
              select: () => ({
                eq: (_col: string, val: string) => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: val === currentSlug ? project : null,
                    error: null,
                  }),
                  eq: (_col2: string, _val2: string) => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: val === currentSlug ? project : null,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'project_media') {
            return {
              select: () => ({
                eq: () => ({
                  order: () => Promise.resolve({ data: mediaRowsOverride, error: null }),
                }),
              }),
            };
          }
          return {};
        },
        storage: {
          from: () => ({
            getPublicUrl: (p: string) => ({ data: { publicUrl: `https://storage.local/${p}` } }),
          }),
        },
      }),
    }));

    if (githubResultOverride) {
      vi.doMock('@/lib/github/sync', async (importOriginal) => {
        const actual = await importOriginal<typeof import('@/lib/github/sync')>();
        return {
          ...actual,
          getGitHubCaseStudy: vi.fn().mockResolvedValue(githubResultOverride),
        };
      });
    }
  }

  it('1. BornoMala: renders complex multi-platform case study with exhibit and omits empty gallery', async () => {
    setupEnvironment('bornomala', {
      success: true,
      rawMarkdown: '## Key Features\n\nFeatures list.\n\n## Supported Typing Layouts\n\n| Layout | Code |\n|---|---|\n| National | Jatiyo |',
      sourceUrl: 'https://github.com/asmkhalid111/BornoMala/blob/master/README.md',
      defaultBranch: 'master',
      chapters: [
        { id: 'key-features', title: 'Key Features', level: 2 },
        { id: 'supported-typing-layouts', title: 'Supported Typing Layouts', level: 2 },
      ],
      extractedImages: [], // Badges filtered out
    });

    const { default: CaseStudyPreviewPage } = await import('@/app/case-study-preview/[slug]/page');
    const pageEl = await CaseStudyPreviewPage({ params: Promise.resolve({ slug: 'bornomala' }) });
    const { container } = render(pageEl);

    // Header & Project Identity
    expect(screen.getByRole('heading', { level: 1, name: /BornoMala \(বর্ণমালা\)/i })).toBeDefined();

    // Narrative Sections
    expect(screen.getByText('Architectural Context & Objectives')).toBeDefined();
    expect(screen.getByText(/The Challenge/i)).toBeDefined();

    // Curated Architecture Exhibit is present
    expect(screen.getByText(/Source-Backed Engineering Exhibit/i)).toBeDefined();

    // Zero-media behavior: Media gallery is cleanly omitted (0 elements)
    expect(container.querySelector('[aria-label="Interactive Project Media Gallery"]')).toBeNull();
    expect(container.querySelector('#gallery-heading')).toBeNull();

    // Markdown Documentation navigation links (present in mobile bar + desktop sidebar)
    expect(screen.getAllByText(/Key Features/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Supported Typing Layouts/i).length).toBeGreaterThanOrEqual(1);
  });

  it('1b. BornoMala: renders cleanly as a generic case study when architecture exhibit is absent', async () => {
    setupEnvironment('bornomala', {
      success: true,
      rawMarkdown: '## Key Features\n\nFeatures list.',
      sourceUrl: 'https://github.com/asmkhalid111/BornoMala/blob/master/README.md',
      defaultBranch: 'master',
      chapters: [{ id: 'key-features', title: 'Key Features', level: 2 }],
      extractedImages: [],
    });

    // Mock getArchitectureExhibit to return undefined (testing generic fallback)
    vi.doMock('@/lib/case-studies/architecture-exhibits', () => ({
      getArchitectureExhibit: vi.fn().mockReturnValue(undefined),
    }));

    const { default: CaseStudyPreviewPage } = await import('@/app/case-study-preview/[slug]/page');
    const pageEl = await CaseStudyPreviewPage({ params: Promise.resolve({ slug: 'bornomala' }) });
    const { container } = render(pageEl);

    // Title and Narrative render cleanly
    expect(screen.getByRole('heading', { level: 1, name: /BornoMala \(বর্ণমালা\)/i })).toBeDefined();

    // Architecture exhibit is NOT rendered
    expect(screen.queryByText(/System Architecture Topology/i)).toBeNull();
    expect(container.querySelector('#system-architecture')).toBeNull();
  });

  it('2. BanglaScript Compiler: renders compiler grammar specification with emoji-stripped slugs and zero media', async () => {
    setupEnvironment('banglascript-compiler', {
      success: true,
      rawMarkdown: '## ✨ Features\n\nBilingual syntax.\n\n## 📝 Language Syntax\n\nGrammar rules.',
      sourceUrl: 'https://github.com/asmkhalid111/Bangla-Compiler-Project/blob/master/README.md',
      defaultBranch: 'master',
      chapters: [
        { id: 'features', title: '✨ Features', level: 2 },
        { id: 'language-syntax', title: '📝 Language Syntax', level: 2 },
      ],
      extractedImages: [],
    });

    const { default: CaseStudyPreviewPage } = await import('@/app/case-study-preview/[slug]/page');
    const pageEl = await CaseStudyPreviewPage({ params: Promise.resolve({ slug: 'banglascript-compiler' }) });
    const { container } = render(pageEl);

    // Identity
    expect(screen.getByRole('heading', { level: 1, name: 'BanglaScript Compiler' })).toBeDefined();

    // Exhibit is NOT rendered (generic)
    expect(screen.queryByText(/System Architecture Topology/i)).toBeNull();

    // Zero-media behavior: Gallery is completely omitted
    expect(container.querySelector('[aria-label="Artifact Gallery"]')).toBeNull();

    // Technologies inventory
    expect(screen.getAllByText('Flex').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bison').length).toBeGreaterThanOrEqual(1);
  });

  it('3. Web-LAN-Chat: promotes genuine screenshots to gallery and deduplicates in drawer', async () => {
    setupEnvironment('web-lan-chat', {
      success: true,
      rawMarkdown: '## 📸 Application Showcase\n\n![Global Chat](https://raw.githubusercontent.com/asmkhalid111/Web-Lan-Chat/master/screenshot_chat.png)\n\nDetailed chat documentation.',
      sourceUrl: 'https://github.com/asmkhalid111/Web-Lan-Chat/blob/master/README.md',
      defaultBranch: 'master',
      chapters: [
        { id: 'application-showcase', title: '📸 Application Showcase', level: 2 },
      ],
      extractedImages: [
        {
          src: 'https://raw.githubusercontent.com/asmkhalid111/Web-Lan-Chat/master/screenshot_chat.png',
          alt: 'Global Chat',
        },
        {
          src: 'https://raw.githubusercontent.com/asmkhalid111/Web-Lan-Chat/master/screenshot_login.png',
          alt: 'Login Page',
        },
      ],
    });

    const { default: CaseStudyPreviewPage } = await import('@/app/case-study-preview/[slug]/page');
    const pageEl = await CaseStudyPreviewPage({ params: Promise.resolve({ slug: 'web-lan-chat' }) });
    const { container } = render(pageEl);

    // Identity
    expect(screen.getByRole('heading', { level: 1, name: 'Web-LAN-Chat' })).toBeDefined();

    // Media gallery IS rendered with promoted screenshots
    const gallery = container.querySelector('[role="region"]');
    expect(gallery).not.toBeNull();
    expect(screen.getByAltText('Global Chat')).toBeDefined();
    expect(screen.getByRole('tab', { name: /Login Page/i })).toBeDefined();
    expect(screen.getAllByText('Repository Artifact').length).toBeGreaterThan(0);

    // Chapter TOC includes Visual Artifacts anchor (desktop sidebar + mobile pill bar)
    expect(screen.getAllByText('Visual Artifacts').length).toBeGreaterThanOrEqual(1);
  });

  it('4. Clean Later (Control): renders completely through generic engine without custom component or exhibit', async () => {
    setupEnvironment('clean-later', {
      success: true,
      rawMarkdown: '## 🚀 Features\n\n- Quick bookmarking\n\n## 🧪 How to Install\n\nInstructions.\n\n## ⚠️ Disclaimer\n\nEducational use only.',
      sourceUrl: 'https://github.com/asmkhalid111/clean-later/blob/master/README.md',
      defaultBranch: 'master',
      chapters: [
        { id: 'features', title: '🚀 Features', level: 2 },
        { id: 'how-to-install', title: '🧪 How to Install', level: 2 },
        { id: 'disclaimer', title: '⚠️ Disclaimer', level: 2 },
      ],
      extractedImages: [], // Zero images
    });

    const { default: CaseStudyPreviewPage } = await import('@/app/case-study-preview/[slug]/page');
    const pageEl = await CaseStudyPreviewPage({ params: Promise.resolve({ slug: 'clean-later' }) });
    const { container } = render(pageEl);

    // Draft Preview notice is displayed because clean-later is draft
    expect(screen.getByText(/ADMIN DRAFT PREVIEW/i)).toBeDefined();

    // Project title & summary
    expect(screen.getByRole('heading', { level: 1, name: 'Clean Later' })).toBeDefined();
    expect(screen.getByText(/A minimalist Chrome extension/i)).toBeDefined();

    // Zero-media: gallery is completely omitted
    expect(container.querySelector('[aria-label="Artifact Gallery"]')).toBeNull();

    // Architecture exhibit is strictly absent
    expect(screen.queryByText(/System Architecture Topology/i)).toBeNull();

    // Source Code action button points to clean-later GitHub repository
    const repoBtn = screen.getByRole('link', { name: /GitHub Repository/i });
    expect(repoBtn.getAttribute('href')).toBe('https://github.com/asmkhalid111/clean-later');

    // Drawer and chapters render correctly
    expect(screen.getByText('Technical Documentation & Setup Manual')).toBeDefined();
    expect(screen.getByText(/3 documented sections/i)).toBeDefined();
  });

  it('5. Documentation Fallback: handles repository without Markdown gracefully without throwing', async () => {
    setupEnvironment('clean-later', {
      success: false,
      rawMarkdown: '',
      sourceUrl: 'https://github.com/asmkhalid111/clean-later',
      defaultBranch: 'master',
      chapters: [],
      extractedImages: [],
      error: 'Upstream repository README returned HTTP 404.',
    });

    const { default: CaseStudyPreviewPage } = await import('@/app/case-study-preview/[slug]/page');
    const pageEl = await CaseStudyPreviewPage({ params: Promise.resolve({ slug: 'clean-later' }) });
    render(pageEl);

    expect(
      screen.getByText(/Repository documentation source: Upstream repository README returned HTTP 404./i)
    ).toBeDefined();
  });
});
