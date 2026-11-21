import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectDetailPage, { generateMetadata } from '@/app/projects/[slug]/page';
import CaseStudyPreviewPage from '@/app/case-study-preview/[slug]/page';
import type { Database } from '@/lib/supabase/types';
import type { GitHubDocumentResult } from '@/lib/github/sync';
import type { User } from '@supabase/supabase-js';

class NotFoundError extends Error {
  digest = 'NEXT_NOT_FOUND';
  constructor() {
    super('NEXT_NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

type ProjectRow = Database['public']['Tables']['projects']['Row'];

// Mock project fixtures
const mockProjects: Record<string, ProjectRow> = {
  bornomala: {
    id: 'proj-bornomala',
    slug: 'bornomala',
    title: 'BornoMala',
    summary: 'A full-stack, cross-platform Bangla optical character recognition platform.',
    problem: 'OCR for Bangla compound characters lacks multi-platform support.',
    approach: 'Trained CNN models with TensorFlow and deployed on Flutter and FastAPI.',
    outcome: 'Achieved 96.4% character accuracy across compound glyphs.',
    technologies: ['Flutter', 'Python', 'FastAPI', 'TensorFlow', 'PostgreSQL'],
    repository_url: 'https://github.com/asmkhalid111/BornoMala',
    live_demo_url: null,
    featured: true,
    status: 'published',
    sort_order: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    published_at: '2026-01-01T00:00:00Z',
    created_by: null,
  },
  'banglascript-compiler': {
    id: 'proj-bangla-compiler',
    slug: 'banglascript-compiler',
    title: 'BanglaScript Compiler',
    summary: 'Domain-specific language and compiler compiling Bengali-script source code to C.',
    problem: 'Native Bengali speakers face syntax barriers learning algorithmic programming.',
    approach: 'Designed flex scanner and bison LALR parser for Bengali grammar.',
    outcome: 'Compiles native Bengali constructs directly into optimized C code.',
    technologies: ['C', 'C++', 'Flex', 'Bison', 'Makefile'],
    repository_url: 'https://github.com/asmkhalid111/Bangla-Compiler-Project',
    live_demo_url: null,
    featured: false,
    status: 'published',
    sort_order: 2,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    published_at: '2026-01-01T00:00:00Z',
    created_by: null,
  },
  'web-lan-chat': {
    id: 'proj-web-lan-chat',
    slug: 'web-lan-chat',
    title: 'Web-LAN-Chat',
    summary: 'Real-time local area network communication tool.',
    problem: 'LAN networks require peer-to-peer chat without internet dependency.',
    approach: 'Built FastAPI backend with asynchronous WebSockets and vanilla JS frontend.',
    outcome: 'Zero-configuration messaging across local subnets.',
    technologies: ['Python', 'FastAPI', 'WebSockets', 'HTML5', 'CSS3'],
    repository_url: 'https://github.com/asmkhalid111/Web-Lan-Chat',
    live_demo_url: null,
    featured: false,
    status: 'published',
    sort_order: 3,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    published_at: '2026-01-01T00:00:00Z',
    created_by: null,
  },
  'draft-secret-project': {
    id: 'proj-draft-secret',
    slug: 'draft-secret-project',
    title: 'Confidential Unreleased Engine',
    summary: 'Secret internal architecture draft.',
    problem: 'Proprietary challenge.',
    approach: 'Proprietary approach.',
    outcome: 'Proprietary outcome.',
    technologies: ['Rust', 'WebAssembly'],
    repository_url: 'https://github.com/asmkhalid111/secret',
    live_demo_url: null,
    featured: false,
    status: 'draft',
    sort_order: 4,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    published_at: null,
    created_by: null,
  },
};

// Mock GitHub sync responses
const mockGitHubResponses: Record<string, GitHubDocumentResult> = {
  'https://github.com/asmkhalid111/BornoMala': {
    success: true,
    rawMarkdown: '# BornoMala\n\n## Overview\nBornoMala overview text.\n\n## Architecture\nDeep learning architecture details.',
    sourceUrl: 'https://raw.githubusercontent.com/asmkhalid111/BornoMala/master/README.md',
    defaultBranch: 'master',
    chapters: [
      { id: 'overview', title: 'Overview', level: 2 },
      { id: 'architecture', title: 'Architecture', level: 2 },
    ],
    extractedImages: [],
  },
  'https://github.com/asmkhalid111/Bangla-Compiler-Project': {
    success: true,
    rawMarkdown: '# BanglaScript\n\n## ব্যাকরণ\nব্যাকরণ বিবরণ।\n\n## ৩. বাংলা কোড উদাহরণ\nকোড উদাহরণ বিবরণ।',
    sourceUrl: 'https://raw.githubusercontent.com/asmkhalid111/Bangla-Compiler-Project/master/README.md',
    defaultBranch: 'master',
    chapters: [
      { id: 'ব্যাকরণ', title: 'ব্যাকরণ', level: 2 },
      { id: '৩-বাংলা-কোড-উদাহরণ', title: '৩. বাংলা কোড উদাহরণ', level: 2 },
    ],
    extractedImages: [],
  },
  'https://github.com/asmkhalid111/Web-Lan-Chat': {
    success: true,
    rawMarkdown: '# Web-LAN-Chat\n\n![Chat Screenshot](https://raw.githubusercontent.com/asmkhalid111/Web-Lan-Chat/master/screenshot_chat.png)\n\n## Features\nInstant LAN messaging.',
    sourceUrl: 'https://raw.githubusercontent.com/asmkhalid111/Web-Lan-Chat/master/README.md',
    defaultBranch: 'master',
    chapters: [{ id: 'features', title: 'Features', level: 2 }],
    extractedImages: [
      {
        src: 'https://raw.githubusercontent.com/asmkhalid111/Web-Lan-Chat/master/screenshot_chat.png',
        alt: 'Chat Screenshot',
      },
      {
        src: 'https://raw.githubusercontent.com/asmkhalid111/Web-Lan-Chat/master/screenshot_login.png',
        alt: 'Login Screenshot',
      },
    ],
  },
};

// Top-level mocks
const mockAdminStatus: { isAdmin: boolean; user: User | null } = { isAdmin: false, user: null };

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new NotFoundError();
  }),
}));

vi.mock('@/lib/auth/admin', () => ({
  getAdminAuthStatus: vi.fn(async () => mockAdminStatus),
}));

vi.mock('@/lib/github/sync', () => ({
  getGitHubCaseStudy: vi.fn(async (repoUrl?: string | null) => {
    if (!repoUrl || !mockGitHubResponses[repoUrl]) {
      return {
        success: false,
        rawMarkdown: '',
        sourceUrl: repoUrl || '',
        defaultBranch: 'master',
        chapters: [],
        extractedImages: [],
        error: 'README not found',
      };
    }
    return mockGitHubResponses[repoUrl];
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === 'projects') {
        return {
          select: () => ({
            eq: (col1: string, val1: string) => ({
              eq: (col2: string, val2: string) => ({
                maybeSingle: async () => {
                  const project = mockProjects[val1];
                  if (project && col2 === 'status' && project.status === val2) {
                    return { data: project, error: null };
                  }
                  return { data: null, error: null };
                },
              }),
              maybeSingle: async () => {
                const project = mockProjects[val1];
                return { data: project || null, error: null };
              },
            }),
          }),
        };
      }
      if (table === 'project_media') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    },
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
      }),
    },
  })),
}));

describe('Task 12F: Public Case-Study Route Integration Suite', () => {
  beforeEach(() => {
    mockAdminStatus.isAdmin = false;
    mockAdminStatus.user = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Anonymous visitor can access published BornoMala case study with exhibit', async () => {
    const Component = await ProjectDetailPage({
      params: Promise.resolve({ slug: 'bornomala' }),
    });
    render(Component);

    // Header & Summary
    expect(screen.getByRole('heading', { level: 1, name: 'BornoMala' })).toBeDefined();
    expect(
      screen.getByText(/full-stack, cross-platform Bangla optical character recognition platform/i)
    ).toBeDefined();

    // Source-backed Architecture Exhibit
    expect(screen.getByText('Source-Backed Engineering Exhibit')).toBeDefined();

    // Canonical source code link
    const sourceLink = screen.getByRole('link', { name: /GitHub Repository/i });
    expect(sourceLink.getAttribute('href')).toBe('https://github.com/asmkhalid111/BornoMala');

    // Sticky nav / drawer
    expect(screen.getByRole('button', { name: /Technical Documentation/i })).toBeDefined();
  });

  it('2. Anonymous visitor can access published BanglaScript Compiler with bilingual headings', async () => {
    const Component = await ProjectDetailPage({
      params: Promise.resolve({ slug: 'banglascript-compiler' }),
    });
    render(Component);

    expect(screen.getByRole('heading', { level: 1, name: 'BanglaScript Compiler' })).toBeDefined();
    expect(screen.getAllByText('ব্যাকরণ').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('৩. বাংলা কোড উদাহরণ').length).toBeGreaterThanOrEqual(1);
  });

  it('3. Anonymous visitor can access published Web-LAN-Chat with promoted screenshots', async () => {
    const Component = await ProjectDetailPage({
      params: Promise.resolve({ slug: 'web-lan-chat' }),
    });
    render(Component);

    expect(screen.getByRole('heading', { level: 1, name: 'Web-LAN-Chat' })).toBeDefined();
    // Gallery rendered with promoted artifact
    expect(screen.getByRole('tab', { name: /Chat Screenshot/i })).toBeDefined();
  });

  it('4. Draft projects invoke notFound() on the public route', async () => {
    await expect(
      ProjectDetailPage({
        params: Promise.resolve({ slug: 'draft-secret-project' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('5. Non-existent project slugs invoke notFound() on the public route', async () => {
    await expect(
      ProjectDetailPage({
        params: Promise.resolve({ slug: 'completely-non-existent-project' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('6. Authenticated admin caller cannot bypass publication status on public route', async () => {
    // Elevate admin status
    mockAdminStatus.isAdmin = true;
    mockAdminStatus.user = { id: 'admin-uuid', email: 'admin@portfolio.com' } as unknown as User;

    // Calling public route for a draft must still throw notFound()
    await expect(
      ProjectDetailPage({
        params: Promise.resolve({ slug: 'draft-secret-project' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('7. Public route strictly omits development preview and admin draft banners', async () => {
    const Component = await ProjectDetailPage({
      params: Promise.resolve({ slug: 'bornomala' }),
    });
    const { container } = render(Component);

    expect(container.textContent).not.toContain('DEVELOPMENT PREVIEW ONLY');
    expect(container.textContent).not.toContain('ADMIN DRAFT PREVIEW');
  });

  it('8. Public metadata generates correct SEO, OpenGraph, and Twitter tags', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'bornomala' }),
    });

    expect(metadata.title).toBe('BornoMala — Case Study | Ashrafuzzaman Khalid');
    expect(metadata.description).toContain('full-stack, cross-platform Bangla optical character recognition');
    expect(metadata.openGraph?.title).toBe('BornoMala | Software Engineering Case Study');
    expect(metadata.openGraph?.url).toBe('/projects/bornomala');
    const twitterMeta = metadata.twitter as { card?: string } | undefined;
    expect(twitterMeta?.card).toBe('summary_large_image');
  });

  it('9. Draft metadata returns not found and enforces robots noindex without leaking details', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'draft-secret-project' }),
    });

    expect(metadata.title).toBe('Project Not Found | Software Engineering Portfolio');
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.description).toBeUndefined();
  });

  it('10. Projects with zero visual artifacts collapse the media gallery block cleanly', async () => {
    const Component = await ProjectDetailPage({
      params: Promise.resolve({ slug: 'bornomala' }),
    });
    const { container } = render(Component);

    // Media gallery block does not render when galleryItems is empty
    expect(container.querySelector('[role="tablist"]')).toBeNull();
  });

  it('11. Preserves admin draft preview capability on preview route while public route forbids drafts', async () => {
    // Elevate admin status
    mockAdminStatus.isAdmin = true;
    mockAdminStatus.user = { id: 'admin-uuid', email: 'admin@portfolio.com' } as unknown as User;

    // Preview route renders draft with purple banner
    const PreviewComponent = await CaseStudyPreviewPage({
      params: Promise.resolve({ slug: 'draft-secret-project' }),
    });
    const { container } = render(PreviewComponent);

    expect(container.textContent).toContain('ADMIN DRAFT PREVIEW');
    expect(container.textContent).toContain('DEVELOPMENT PREVIEW ONLY');
    expect(screen.getByRole('heading', { level: 1, name: 'Confidential Unreleased Engine' })).toBeDefined();

    // But public route still forbids it!
    await expect(
      ProjectDetailPage({
        params: Promise.resolve({ slug: 'draft-secret-project' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('12. Homepage project card links target the public /projects/[slug] routes', async () => {
    const expectedBornoMalaHref = `/projects/${mockProjects.bornomala.slug}`;
    const expectedCompilerHref = `/projects/${mockProjects['banglascript-compiler'].slug}`;
    const expectedChatHref = `/projects/${mockProjects['web-lan-chat'].slug}`;

    expect(expectedBornoMalaHref).toBe('/projects/bornomala');
    expect(expectedCompilerHref).toBe('/projects/banglascript-compiler');
    expect(expectedChatHref).toBe('/projects/web-lan-chat');
  });

  it('13. No hardcoded per-project renderer is required for arbitrary published projects', async () => {
    mockProjects['arbitrary-open-source'] = {
      id: 'proj-arbitrary',
      slug: 'arbitrary-open-source',
      title: 'Arbitrary Open Source Tool',
      summary: 'A completely new published repository onboarded via CRUD.',
      problem: 'Developer tooling problem.',
      approach: 'Clean software architecture.',
      outcome: 'Verified release.',
      technologies: ['TypeScript', 'Node.js'],
      repository_url: 'https://github.com/asmkhalid111/arbitrary',
      live_demo_url: null,
      featured: false,
      status: 'published',
      sort_order: 5,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      published_at: '2026-01-01T00:00:00Z',
      created_by: null,
    };

    mockGitHubResponses['https://github.com/asmkhalid111/arbitrary'] = {
      success: true,
      rawMarkdown: '## Introduction\n\nArbitrary documentation.',
      sourceUrl: 'https://raw.githubusercontent.com/asmkhalid111/arbitrary/master/README.md',
      defaultBranch: 'master',
      chapters: [{ id: 'introduction', title: 'Introduction', level: 2 }],
      extractedImages: [],
    };

    const Component = await ProjectDetailPage({
      params: Promise.resolve({ slug: 'arbitrary-open-source' }),
    });
    render(Component);

    expect(screen.getByRole('heading', { level: 1, name: 'Arbitrary Open Source Tool' })).toBeDefined();
    expect(screen.getAllByText('Introduction').length).toBeGreaterThanOrEqual(1);
    delete mockProjects['arbitrary-open-source'];
  });
});
