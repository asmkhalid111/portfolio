import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CaseStudyHeader } from '@/components/case-study/CaseStudyHeader';
import { MediaGalleryBlock } from '@/components/case-study/MediaGalleryBlock';
import { MarkdownContent } from '@/components/case-study/MarkdownContent';

describe('Case Study Reusable Components', () => {
  describe('CaseStudyHeader', () => {
    it('renders authentic project title, summary, and technologies without hardcoded grids', () => {
      render(
        <CaseStudyHeader
          title="BanglaScript Compiler"
          summary="Bilingual educational compiler."
          featured={false}
          technologies={['Flex', 'Bison', 'C++']}
          repositoryUrl="https://github.com/asmkhalid111/Bangla-Compiler-Project"
        />
      );

      expect(screen.getByRole('heading', { level: 1, name: 'BanglaScript Compiler' })).toBeDefined();
      expect(screen.getByText('Bilingual educational compiler.')).toBeDefined();
      expect(screen.getByText('Flex')).toBeDefined();
      expect(screen.getByText('Bison')).toBeDefined();
      expect(screen.getByText('C++')).toBeDefined();

      // Ensure no artificial specification categories exist
      expect(screen.queryByText('Role & Focus')).toBeNull();
      expect(screen.queryByText('Core Stack')).toBeNull();
      expect(screen.queryByText('Architecture')).toBeNull();
      expect(screen.queryByText('Verification')).toBeNull();
      expect(screen.queryByText(/Modular Component Architecture/i)).toBeNull();
      expect(screen.queryByText(/Event-Driven WebSocket/i)).toBeNull();
    });

    it('renders GitHub action button only when repositoryUrl is present', () => {
      const { rerender } = render(
        <CaseStudyHeader
          title="Minimal Project"
          summary="No links"
        />
      );

      expect(screen.queryByText('GitHub Repository')).toBeNull();
      expect(screen.queryByText('Live Demonstration')).toBeNull();

      rerender(
        <CaseStudyHeader
          title="Minimal Project"
          summary="With repo"
          repositoryUrl="https://github.com/example/repo"
        />
      );

      expect(screen.getByText('GitHub Repository')).toBeDefined();
    });
  });

  describe('MediaGalleryBlock', () => {
    it('returns null and renders zero DOM elements when media is empty', () => {
      const { container } = render(<MediaGalleryBlock media={[]} title="Test Artifacts" />);
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText(/Documentation-Driven Case Study/i)).toBeNull();
      expect(screen.queryByRole('region')).toBeNull();
    });

    it('renders gallery items when authentic media is provided', () => {
      render(
        <MediaGalleryBlock
          media={[
            {
              id: 'art-1',
              src: 'https://example.com/screenshot1.png',
              alt: 'First Screenshot',
              caption: 'First specimen caption',
            },
          ]}
          title="Artifact Gallery"
        />
      );

      expect(screen.getByRole('region', { name: /Artifact Gallery/i })).toBeDefined();
      expect(screen.getByText('Artifact Gallery (1 Artifact)')).toBeDefined();
      expect(screen.getByAltText('First Screenshot')).toBeDefined();
      expect(screen.getByText('First specimen caption')).toBeDefined();
    });

    it('transitions to accessible error fallback when an image fails to load without crashing', () => {
      render(
        <MediaGalleryBlock
          media={[
            {
              id: 'broken-1',
              src: 'https://broken.example.com/missing.png',
              alt: 'Broken Specimen',
              caption: 'Caption for broken image',
            },
          ]}
          title="Fault Tolerant Gallery"
        />
      );

      const img = screen.getByAltText('Broken Specimen');
      expect(img).toBeDefined();

      // Trigger image error
      fireEvent.error(img);

      // Verify graceful fallback UI
      expect(screen.getByText('Image artifact preview unavailable')).toBeDefined();
      expect(screen.getByText('https://broken.example.com/missing.png')).toBeDefined();
      expect(screen.getByText('Caption for broken image')).toBeDefined();
    });

    it('preserves access to other gallery artifacts and maintains keyboard interaction when one item fails', () => {
      render(
        <MediaGalleryBlock
          media={[
            {
              id: 'item-0',
              src: 'https://broken.example.com/fail.png',
              alt: 'Failed Item 0',
              caption: 'First item fails',
            },
            {
              id: 'item-1',
              src: 'https://valid.example.com/success.png',
              alt: 'Valid Item 1',
              caption: 'Second item succeeds',
            },
          ]}
          title="Multi-Item Gallery"
        />
      );

      // Trigger error on first item
      const img0 = screen.getByAltText('Failed Item 0');
      fireEvent.error(img0);
      expect(screen.getByText('Image artifact preview unavailable')).toBeDefined();

      // Navigate to second item via keyboard ArrowRight
      const galleryRegion = screen.getByRole('region', { name: /Multi-Item Gallery/i });
      fireEvent.keyDown(galleryRegion, { key: 'ArrowRight' });

      // Second item should be visible and render its image normally
      expect(screen.getByAltText('Valid Item 1')).toBeDefined();
      expect(screen.getByText('Second item succeeds')).toBeDefined();
      expect(screen.queryByText('Image artifact preview unavailable')).toBeNull();

      // Navigate back to first item via ArrowLeft
      fireEvent.keyDown(galleryRegion, { key: 'ArrowLeft' });
      expect(screen.getByText('Image artifact preview unavailable')).toBeDefined();
      expect(screen.getByText('First item fails')).toBeDefined();
    });
  });

  describe('MarkdownContent Image Deduplication', () => {
    it('suppresses inline images whose URLs are present in promotedImageUrls', () => {
      const markdown = `
Here is a lead screenshot:
![Lead Screenshot](https://example.com/promoted.png)

Here is a secondary inline image:
![Inline Specimen](https://example.com/retained.png)
`;

      render(
        <MarkdownContent
          content={markdown}
          promotedImageUrls={['https://example.com/promoted.png']}
        />
      );

      expect(screen.queryByAltText('Lead Screenshot')).toBeNull();
      expect(screen.getByAltText('Inline Specimen')).toBeDefined();
    });
  });
});
