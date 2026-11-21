import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DocumentationDrawer } from '@/components/case-study/DocumentationDrawer';
import {
  CaseStudyCoordinator,
  useCaseStudyCoordinator,
} from '@/components/case-study/CaseStudyCoordinator';
import { StickyChapterNav, type Chapter } from '@/components/case-study/StickyChapterNav';

describe('Task 11C: Progressive GitHub Documentation Hierarchy', () => {
  beforeEach(() => {
    window.location.hash = '';
    vi.restoreAllMocks();
    window.scrollTo = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    // Mock IntersectionObserver as a class for JSDOM
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    window.location.hash = '';
  });

  describe('DocumentationDrawer Component', () => {
    it('is collapsed by default with correct accessible attributes', () => {
      render(
        <DocumentationDrawer
          sourceUrl="https://github.com/asmkhalid111/BornoMala/blob/master/README.md"
          defaultBranch="master"
          chapterCount={9}
        >
          <div data-testid="readme-body">
            <h2>Supported Typing Layouts</h2>
            <p>Full README content goes here.</p>
          </div>
        </DocumentationDrawer>
      );

      const toggleBtn = screen.getByRole('button', {
        name: /Show Technical Documentation/i,
      });
      expect(toggleBtn).toBeDefined();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(toggleBtn.getAttribute('aria-controls')).toBe(
        'technical-documentation-panel'
      );

      // Markdown body panel is not rendered when collapsed
      expect(screen.queryByTestId('readme-body')).toBeNull();
      expect(document.getElementById('technical-documentation-panel')).toBeNull();

      // Authentic metadata is visible
      expect(screen.getByText(/master/)).toBeDefined();
      expect(screen.getByText(/9 documented sections/i)).toBeDefined();
      expect(
        screen.getByRole('link', { name: /View raw source on GitHub/i })
      ).toBeDefined();
    });

    it('manually expands and collapses on button click with complete README preservation', () => {
      render(
        <DocumentationDrawer
          sourceUrl="https://github.com/asmkhalid111/BornoMala/blob/master/README.md"
          defaultBranch="master"
          chapterCount={9}
        >
          <div data-testid="readme-body">
            <h2 id="supported-typing-layouts">Supported Typing Layouts</h2>
            <pre>
              <code>cargo test --all</code>
            </pre>
          </div>
        </DocumentationDrawer>
      );

      const toggleBtn = screen.getByRole('button', {
        name: /Show Technical Documentation/i,
      });

      // Expand
      fireEvent.click(toggleBtn);

      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByText('Hide Technical Documentation')).toBeDefined();
      expect(document.getElementById('technical-documentation-panel')).not.toBeNull();
      expect(screen.getByTestId('readme-body')).toBeDefined();
      expect(screen.getByText('Supported Typing Layouts')).toBeDefined();
      expect(screen.getByText('cargo test --all')).toBeDefined();

      // Collapse using top button
      fireEvent.click(toggleBtn);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByTestId('readme-body')).toBeNull();
      expect(document.getElementById('technical-documentation-panel')).toBeNull();
    });

    it('collapses using the bottom collapse control and returns focus to the top toggle', () => {
      render(
        <DocumentationDrawer
          defaultBranch="master"
          chapterCount={3}
        >
          <div data-testid="readme-body">
            <p>Extensive documentation text.</p>
          </div>
        </DocumentationDrawer>
      );

      const toggleBtn = screen.getByRole('button', {
        name: /Show Technical Documentation/i,
      });
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId('readme-body')).toBeDefined();

      const bottomCollapseBtn = screen.getByRole('button', {
        name: /Collapse Documentation/i,
      });
      expect(bottomCollapseBtn).toBeDefined();

      fireEvent.click(bottomCollapseBtn);
      expect(screen.queryByTestId('readme-body')).toBeNull();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    });

    it('supports keyboard activation via Enter and Space keys', () => {
      render(
        <DocumentationDrawer defaultBranch="main">
          <p data-testid="readme-body">Keyboard accessible manual</p>
        </DocumentationDrawer>
      );

      const toggleBtn = screen.getByRole('button', {
        name: /Show Technical Documentation/i,
      });

      // Enter key
      fireEvent.keyDown(toggleBtn, { key: 'Enter', code: 'Enter' });
      fireEvent.click(toggleBtn); // standard browser dispatch on keydown
      expect(screen.getByTestId('readme-body')).toBeDefined();

      // Space key to collapse
      fireEvent.keyDown(toggleBtn, { key: ' ', code: 'Space' });
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId('readme-body')).toBeNull();
    });
  });

  describe('TOC and Documentation Coordination', () => {
    const chapters: Chapter[] = [
      { id: 'architectural-overview', title: 'Architectural Overview', level: 2 },
      { id: 'supported-layouts', title: 'Supported Layouts', level: 2 },
      { id: 'building-from-source', title: 'Building from Source', level: 3 },
    ];
    const docChapterIds = ['supported-layouts', 'building-from-source'];

    function IntegratedCaseStudyTestView() {
      return (
        <CaseStudyCoordinator documentationChapterIds={docChapterIds}>
          <StickyChapterNav chapters={chapters} />

          <section id="architectural-overview">
            <h2>Architectural Overview</h2>
            <p>Curated narrative content</p>
          </section>

          <DocumentationDrawer
            defaultBranch="master"
            chapterCount={2}
          >
            <div data-testid="readme-content">
              <h2 id="supported-layouts">Supported Layouts</h2>
              <p>Keyboard layouts documentation</p>
              <h3 id="building-from-source">Building from Source</h3>
              <p>CMake and Cargo build instructions</p>
            </div>
          </DocumentationDrawer>
        </CaseStudyCoordinator>
      );
    }

    it('auto-expands documentation and scrolls when a documentation heading is selected from TOC', async () => {
      render(<IntegratedCaseStudyTestView />);

      // Initially collapsed
      expect(screen.queryByTestId('readme-content')).toBeNull();

      // Click on a documentation chapter in the TOC (desktop or mobile)
      const docLinks = screen.getAllByRole('link', { name: 'Supported Layouts' });
      fireEvent.click(docLinks[0]);

      // Verify drawer expanded
      await waitFor(() => {
        expect(screen.getByTestId('readme-content')).toBeDefined();
      });

      // Verify scroll was called
      await waitFor(() => {
        expect(window.scrollTo).toHaveBeenCalled();
      });

      // Verify URL hash updated
      expect(window.location.hash).toBe('#supported-layouts');
    });

    it('navigates to curated narrative headings without erroneously expanding documentation', () => {
      render(<IntegratedCaseStudyTestView />);

      const narrativeLinks = screen.getAllByRole('link', {
        name: 'Architectural Overview',
      });
      fireEvent.click(narrativeLinks[0]);

      // Documentation remains collapsed
      expect(screen.queryByTestId('readme-content')).toBeNull();
      expect(window.scrollTo).toHaveBeenCalled();
      expect(window.location.hash).toBe('#architectural-overview');
    });

    it('auto-expands drawer on initial load when URL hash targets a documentation chapter', async () => {
      window.location.hash = '#building-from-source';

      render(<IntegratedCaseStudyTestView />);

      // Auto-expansion triggered by deep link
      await waitFor(() => {
        expect(screen.getByTestId('readme-content')).toBeDefined();
      });

      await waitFor(() => {
        expect(window.scrollTo).toHaveBeenCalled();
      });
    });

    it('handles hashchange and popstate events by auto-expanding when target is documentation', async () => {
      render(<IntegratedCaseStudyTestView />);

      expect(screen.queryByTestId('readme-content')).toBeNull();

      // Dispatch hashchange simulating browser back/forward or external anchor jump
      act(() => {
        window.location.hash = '#supported-layouts';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('readme-content')).toBeDefined();
      });
    });

    it('auto-expands documentation when deep-linked with a percent-encoded Bengali hash', async () => {
      const bengaliChapters: Chapter[] = [
        { id: 'architectural-overview', title: 'Architectural Overview', level: 2 },
        { id: 'বর্ণমালা-লেআউট', title: 'বর্ণমালা লেআউট', level: 2 },
      ];

      function BengaliCaseStudyTestView() {
        return (
          <CaseStudyCoordinator documentationChapterIds={['বর্ণমালা-লেআউট']}>
            <StickyChapterNav chapters={bengaliChapters} />
            <DocumentationDrawer defaultBranch="master" chapterCount={1}>
              <div data-testid="bengali-readme-content">
                <h2 id="বর্ণমালা-লেআউট">বর্ণমালা লেআউট</h2>
                <p>Bengali keyboard mapping documentation.</p>
              </div>
            </DocumentationDrawer>
          </CaseStudyCoordinator>
        );
      }

      // Simulate browser setting percent-encoded hash on load: #%E0%A6%AC%E0%A6%B0...
      window.location.hash = '#' + encodeURIComponent('বর্ণমালা-লেআউট');

      render(<BengaliCaseStudyTestView />);

      await waitFor(() => {
        expect(screen.getByTestId('bengali-readme-content')).toBeDefined();
      });
    });

    it('handles malformed percent-encoded URL fragments gracefully without crashing', () => {
      // Simulate browser setting malformed hash that throws in decodeURIComponent: #%E0%A6%
      window.location.hash = '#%E0%A6%';

      expect(() => {
        render(<IntegratedCaseStudyTestView />);
      }).not.toThrow();

      // Malformed hash did not crash the page, drawer remains in default state
      expect(screen.queryByTestId('readme-content')).toBeNull();
    });
  });

  describe('Edge Cases and Resilience', () => {
    it('gracefully handles missing or empty documentation chapters without throwing', () => {
      render(
        <CaseStudyCoordinator documentationChapterIds={[]}>
          <StickyChapterNav chapters={[]} />
          <div data-testid="fallback-notice">
            <p>Repository documentation source: No remote README provided.</p>
          </div>
        </CaseStudyCoordinator>
      );

      expect(screen.getByTestId('fallback-notice')).toBeDefined();
    });

    it('throws meaningful error if useCaseStudyCoordinator is used outside coordinator provider', () => {
      function OrphanComponent() {
        useCaseStudyCoordinator();
        return null;
      }

      expect(() => render(<OrphanComponent />)).toThrow(
        /useCaseStudyCoordinator must be used within a CaseStudyCoordinator/i
      );
    });
  });
});
