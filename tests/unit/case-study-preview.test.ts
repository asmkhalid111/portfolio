import { describe, it, expect, vi, afterEach } from 'vitest';

describe('Case Study Preview Route Security & Invariants', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('enforces notFound() in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const notFoundMock = vi.fn();
    vi.doMock('next/navigation', () => ({
      notFound: notFoundMock,
    }));

    // Import page with mocked notFound
    const { default: CaseStudyPreviewPage } = await import(
      '@/app/case-study-preview/[slug]/page'
    );

    try {
      await CaseStudyPreviewPage({
        params: Promise.resolve({ slug: 'web-lan-chat' }),
      });
    } catch {
      // notFound typically throws NEXT_HTTP_ERROR_FALLBACK;404
    }

    expect(notFoundMock).toHaveBeenCalled();
  }, 15000);
});
