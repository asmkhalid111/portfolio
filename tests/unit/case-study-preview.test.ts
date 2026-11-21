import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditProjectForm } from '@/app/admin/(dashboard)/projects/[id]/edit-form';
import type { Database } from '@/lib/supabase/types';

// Standard mock for next/navigation notFound() that throws (matching actual Next.js behaviour)
class NotFoundError extends Error {
  digest = 'NEXT_NOT_FOUND';
  constructor() {
    super('NEXT_NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

describe('Case Study Preview Route Security & Invariants', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('Environment Guard Invariants', () => {
    it('enforces notFound() in Vercel Production mode regardless of NODE_ENV', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('VERCEL_ENV', 'production');

      const notFoundMock = vi.fn(() => {
        throw new NotFoundError();
      });
      vi.doMock('next/navigation', () => ({
        notFound: notFoundMock,
      }));

      const { default: CaseStudyPreviewPage } = await import(
        '@/app/case-study-preview/[slug]/page'
      );

      await expect(
        CaseStudyPreviewPage({
          params: Promise.resolve({ slug: 'web-lan-chat' }),
        })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(notFoundMock).toHaveBeenCalled();
    });

    it('enforces notFound() in node production mode without preview flag', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('VERCEL_ENV', '');
      vi.stubEnv('CASE_STUDY_PREVIEW_ENABLED', '');

      const notFoundMock = vi.fn(() => {
        throw new NotFoundError();
      });
      vi.doMock('next/navigation', () => ({
        notFound: notFoundMock,
      }));

      const { default: CaseStudyPreviewPage } = await import(
        '@/app/case-study-preview/[slug]/page'
      );

      await expect(
        CaseStudyPreviewPage({
          params: Promise.resolve({ slug: 'web-lan-chat' }),
        })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(notFoundMock).toHaveBeenCalled();
    });

    it('enforces notFound() in Vercel Preview when flag is disabled or set to false', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('VERCEL_ENV', 'preview');
      vi.stubEnv('CASE_STUDY_PREVIEW_ENABLED', 'false');

      const notFoundMock = vi.fn(() => {
        throw new NotFoundError();
      });
      vi.doMock('next/navigation', () => ({
        notFound: notFoundMock,
      }));

      const { default: CaseStudyPreviewPage } = await import(
        '@/app/case-study-preview/[slug]/page'
      );

      await expect(
        CaseStudyPreviewPage({
          params: Promise.resolve({ slug: 'web-lan-chat' }),
        })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(notFoundMock).toHaveBeenCalled();
    });

    it('invokes notFound() when slug parameter is empty', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('VERCEL_ENV', '');

      const notFoundMock = vi.fn(() => {
        throw new NotFoundError();
      });
      vi.doMock('next/navigation', () => ({
        notFound: notFoundMock,
      }));

      const { default: CaseStudyPreviewPage } = await import(
        '@/app/case-study-preview/[slug]/page'
      );

      await expect(
        CaseStudyPreviewPage({
          params: Promise.resolve({ slug: '' }),
        })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(notFoundMock).toHaveBeenCalled();
    });
  });

  describe('Admin Draft Authorization Invariants', () => {
    function setupMocks({
      isAdmin = false,
      user = null,
      projectData = null,
      projectError = null,
    }: {
      isAdmin?: boolean;
      user?: { id: string } | null;
      projectData?: unknown;
      projectError?: unknown;
    }) {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('VERCEL_ENV', '');

      const notFoundMock = vi.fn(() => {
        throw new NotFoundError();
      });

      vi.doMock('next/navigation', () => ({
        notFound: notFoundMock,
      }));

      vi.doMock('@/lib/auth/admin', () => ({
        getAdminAuthStatus: vi.fn().mockResolvedValue({
          user,
          isAdmin,
          error: isAdmin ? null : (user ? 'forbidden' : 'unauthenticated'),
        }),
      }));

      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: projectData,
        error: projectError,
      });

      const eqMock = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleMock,
        eq: vi.fn().mockReturnValue({
          maybeSingle: maybeSingleMock,
        }),
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
        order: vi.fn().mockReturnValue({
          data: [],
        }),
      });

      const fromMock = vi.fn((table: string) => {
        if (table === 'projects') {
          return { select: selectMock };
        }
        if (table === 'project_media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          };
        }
        return { select: selectMock };
      });

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn().mockResolvedValue({
          from: fromMock,
          storage: {
            from: vi.fn().mockReturnValue({
              getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
            }),
          },
        }),
      }));

      vi.doMock('@/lib/github/sync', () => ({
        getGitHubCaseStudy: vi.fn().mockResolvedValue({
          success: true,
          rawMarkdown: '# Mock Documentation',
          sourceUrl: 'https://github.com/mock/repo',
          defaultBranch: 'master',
          chapters: [],
          extractedImages: [],
        }),
      }));

      vi.doMock('@/lib/case-studies/architecture-exhibits', () => ({
        getArchitectureExhibit: vi.fn().mockReturnValue(null),
      }));

      return { notFoundMock, selectMock, eqMock, maybeSingleMock };
    }

    it('allows verified admin to view unpublished draft project and renders ADMIN DRAFT PREVIEW notice', async () => {
      const mockDraftProject = {
        id: 'draft-id-1',
        title: 'Draft Project Title',
        slug: 'draft-project',
        summary: 'This is an unpublished draft summary.',
        status: 'draft',
        technologies: ['TypeScript', 'Rust'],
        repository_url: 'https://github.com/user/draft-repo',
        live_demo_url: null,
        featured: false,
        problem: 'Draft problem description',
        approach: 'Draft engineering approach',
        outcome: 'Draft outcome deliverables',
      };

      const { notFoundMock } = setupMocks({
        isAdmin: true,
        user: { id: 'admin-user-id' },
        projectData: mockDraftProject,
      });

      const { default: CaseStudyPreviewPage } = await import(
        '@/app/case-study-preview/[slug]/page'
      );

      const rendered = await CaseStudyPreviewPage({
        params: Promise.resolve({ slug: 'draft-project' }),
      });

      expect(notFoundMock).not.toHaveBeenCalled();

      // Render to DOM to verify the admin draft preview banner is present
      const { container } = render(rendered);
      expect(container.textContent).toContain('ADMIN DRAFT PREVIEW');
      expect(container.textContent).toContain('unpublished draft');
      expect(container.textContent).toContain('Draft Project Title');
    });

    it('denies anonymous user from viewing draft project by triggering notFound()', async () => {
      // Mock setup where anonymous query returns null because status='published' is enforced
      const { notFoundMock } = setupMocks({
        isAdmin: false,
        user: null,
        projectData: null, // Anonymous caller query with status=published returns null
      });

      const { default: CaseStudyPreviewPage } = await import(
        '@/app/case-study-preview/[slug]/page'
      );

      await expect(
        CaseStudyPreviewPage({
          params: Promise.resolve({ slug: 'draft-project' }),
        })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(notFoundMock).toHaveBeenCalled();
    });

    it('denies authenticated non-admin user from viewing draft project by triggering notFound()', async () => {
      const { notFoundMock } = setupMocks({
        isAdmin: false,
        user: { id: 'regular-user-id' },
        projectData: null,
      });

      const { default: CaseStudyPreviewPage } = await import(
        '@/app/case-study-preview/[slug]/page'
      );

      await expect(
        CaseStudyPreviewPage({
          params: Promise.resolve({ slug: 'draft-project' }),
        })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(notFoundMock).toHaveBeenCalled();
    });

    it('allows anonymous visitor to view published project without displaying admin draft banner', async () => {
      const mockPublishedProject = {
        id: 'pub-id-1',
        title: 'Published Project Title',
        slug: 'published-project',
        summary: 'This is a published summary.',
        status: 'published',
        technologies: ['React'],
        repository_url: 'https://github.com/user/pub-repo',
        live_demo_url: null,
        featured: false,
        problem: 'Published problem',
        approach: 'Published approach',
        outcome: 'Published outcome',
      };

      const { notFoundMock } = setupMocks({
        isAdmin: false,
        user: null,
        projectData: mockPublishedProject,
      });

      const { default: CaseStudyPreviewPage } = await import(
        '@/app/case-study-preview/[slug]/page'
      );

      const rendered = await CaseStudyPreviewPage({
        params: Promise.resolve({ slug: 'published-project' }),
      });

      expect(notFoundMock).not.toHaveBeenCalled();

      const { container } = render(rendered);
      expect(container.textContent).not.toContain('ADMIN DRAFT PREVIEW');
      expect(container.textContent).toContain('DEVELOPMENT PREVIEW ONLY');
      expect(container.textContent).toContain('Published Project Title');
    });

    it('triggers notFound() when project does not exist in database', async () => {
      const { notFoundMock } = setupMocks({
        isAdmin: true,
        user: { id: 'admin-id' },
        projectData: null,
      });

      const { default: CaseStudyPreviewPage } = await import(
        '@/app/case-study-preview/[slug]/page'
      );

      await expect(
        CaseStudyPreviewPage({
          params: Promise.resolve({ slug: 'non-existent-project' }),
        })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(notFoundMock).toHaveBeenCalled();
    });

    it('fails closed when admin authorization throws or encounters error', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('VERCEL_ENV', '');

      const notFoundMock = vi.fn(() => {
        throw new NotFoundError();
      });

      vi.doMock('next/navigation', () => ({
        notFound: notFoundMock,
      }));

      // Simulate database error during authorization evaluation
      vi.doMock('@/lib/auth/admin', () => ({
        getAdminAuthStatus: vi.fn().mockResolvedValue({
          user: null,
          isAdmin: false,
          error: 'database_error',
        }),
      }));

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      }));

      const { default: CaseStudyPreviewPage } = await import(
        '@/app/case-study-preview/[slug]/page'
      );

      await expect(
        CaseStudyPreviewPage({
          params: Promise.resolve({ slug: 'draft-project' }),
        })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(notFoundMock).toHaveBeenCalled();
    });
  });

  describe('Admin Edit Page Preview Link Invariant', () => {
    it('renders preview link targeting persisted project.slug, not unsaved input state', () => {
      const mockProject: Database['public']['Tables']['projects']['Row'] = {
        id: 'proj-123',
        title: 'Initial Project Title',
        slug: 'initial-saved-slug',
        summary: 'Initial project summary of sufficient length.',
        technologies: ['TypeScript'],
        repository_url: 'https://github.com/user/repo',
        live_demo_url: null,
        problem: null,
        approach: null,
        outcome: null,
        status: 'draft',
        featured: false,
        sort_order: 0,
        created_at: new Date().toISOString(),
        created_by: 'admin-id',
        published_at: null,
        updated_at: new Date().toISOString(),
      };

      render(React.createElement(EditProjectForm, { project: mockProject }));

      // Verify the Preview Case Study anchor exists and targets the saved project.slug
      const previewLink = screen.getByRole('link', { name: /Preview Case Study/i });
      expect(previewLink).toBeDefined();
      expect(previewLink.getAttribute('href')).toBe('/case-study-preview/initial-saved-slug');
      expect(previewLink.getAttribute('target')).toBe('_blank');
      expect(previewLink.getAttribute('rel')).toContain('noopener');

      // Verify helper text is present to guide the administrator
      expect(screen.getByText(/Uses saved slug\. Save changes before previewing\./i)).toBeDefined();
    });
  });
});
