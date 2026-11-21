import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import {
  slugify,
  HeadingSlugger,
  RESERVED_PAGE_ANCHORS,
} from '@/lib/case-studies/slugger';
import { extractMarkdownChapters } from '@/lib/github/sync';
import { MarkdownContent } from '@/components/case-study/MarkdownContent';

describe('Task 12D: Heading Slugger & Navigation Synchronization', () => {
  describe('Pure slugify utility', () => {
    it('1. handles ordinary English headings with punctuation and spacing', () => {
      expect(slugify('Architecture & Design')).toBe('architecture-design');
      expect(slugify('WebSocket API (v2.0)')).toBe('websocket-api-v20');
      expect(slugify('Production Deployment -- AWS')).toBe('production-deployment-aws');
    });

    it('5. preserves Bengali letters, combining vowel signs (kar), hasant, and numerals', () => {
      expect(slugify('বর্ণমালা লেআউট')).toBe('বর্ণমালা-লেআউট');
      expect(slugify('বিজয়ের রূপরেখা')).toBe('বিজয়ের-রূপরেখা');
      expect(slugify('ভূমিকা ও পরিচিতি (পর্ব ১)')).toBe('ভূমিকা-ও-পরিচিতি-পর্ব-১');
    });

    it('6 & 7. strips punctuation and special characters from text with formatting', () => {
      expect(slugify('Getting Started Guide')).toBe('getting-started-guide');
      expect(slugify('Using cargo run with strict mode')).toBe('using-cargo-run-with-strict-mode');
    });

    it('strips emoji variation selectors (\uFE0F) so emoji-prefixed headings produce clean slugs', () => {
      expect(slugify('⚠️ Disclaimer')).toBe('disclaimer');
      expect(slugify('🚀 Features')).toBe('features');
      expect(slugify('✨ Features')).toBe('features');
      expect(slugify('📸 Application Showcase')).toBe('application-showcase');
      expect(slugify('🧪 How to Install (Manual / Developer Mode)')).toBe('how-to-install-manual-developer-mode');
    });

    it('8. returns empty string for pure punctuation or symbols', () => {
      expect(slugify('???')).toBe('');
      expect(slugify('!!!')).toBe('');
      expect(slugify('   ')).toBe('');
      expect(slugify('100%')).toBe('100');
    });
  });

  describe('HeadingSlugger stateful allocator', () => {
    it('2. allocates unique IDs for repeated H2 headings using -1, -2 suffixes', () => {
      const slugger = new HeadingSlugger();
      expect(slugger.slug('Installation')).toBe('installation');
      expect(slugger.slug('Usage')).toBe('usage');
      expect(slugger.slug('Installation')).toBe('installation-1');
      expect(slugger.slug('Installation')).toBe('installation-2');
    });

    it('3. allocates unique IDs for repeated H3 headings using -1, -2 suffixes', () => {
      const slugger = new HeadingSlugger();
      expect(slugger.slug('Configuration')).toBe('configuration');
      expect(slugger.slug('Verification')).toBe('verification');
      expect(slugger.slug('Configuration')).toBe('configuration-1');
    });

    it('4. allocates sequential IDs across mixed heading levels', () => {
      const slugger = new HeadingSlugger();
      expect(slugger.slug('Overview')).toBe('overview');
      expect(slugger.slug('Overview')).toBe('overview-1');
      expect(slugger.slug('Overview')).toBe('overview-2');
    });

    it('8. provides deterministic fallback IDs (section, section-1) for empty or punctuation-only headings', () => {
      const slugger = new HeadingSlugger();
      expect(slugger.slug('???')).toBe('section');
      expect(slugger.slug('Installation')).toBe('installation');
      expect(slugger.slug('???')).toBe('section-1');
      expect(slugger.slug('')).toBe('section-2');
    });

    it('9. prevents collisions with reserved static page section IDs', () => {
      const slugger = new HeadingSlugger(RESERVED_PAGE_ANCHORS);
      // 'architectural-overview' and 'system-architecture' are in RESERVED_PAGE_ANCHORS
      expect(slugger.slug('Architectural Overview')).toBe('architectural-overview-1');
      expect(slugger.slug('System Architecture')).toBe('system-architecture-1');
      expect(slugger.slug('Architectural Overview')).toBe('architectural-overview-2');
      // Unreserved headings still receive base slug
      expect(slugger.slug('System Performance')).toBe('system-performance');
    });
  });

  describe('AST Chapter Extraction (sync.ts)', () => {
    it('10. strictly ignores headings inside fenced code blocks', () => {
      const markdown = `
# Repository Title

Here is how to write markdown:
\`\`\`markdown
## Fake Heading Inside Code Block
### Another Fake In Code
\`\`\`

~~~
## Tilde Fenced Fake Heading
~~~

## Real Architecture Heading
Actual architectural details.
`;
      const chapters = extractMarkdownChapters(markdown);
      expect(chapters).toEqual([
        { id: 'real-architecture-heading', title: 'Real Architecture Heading', level: 2 },
      ]);
    });

    it('6 & 7. resolves rich formatting inside headings to clean plain text in TOC', () => {
      const markdown = `
## [Quick Start Guide](https://github.com/example/repo)
## Using \`cargo run\` with **strict** mode
### Version 2.0 (Stable)
`;
      const chapters = extractMarkdownChapters(markdown);
      expect(chapters).toEqual([
        { id: 'quick-start-guide', title: 'Quick Start Guide', level: 2 },
        { id: 'using-cargo-run-with-strict-mode', title: 'Using cargo run with strict mode', level: 2 },
        { id: 'version-20-stable', title: 'Version 2.0 (Stable)', level: 3 },
      ]);
    });

    it('5. extracts Bengali chapters with preserved Unicode titles and IDs', () => {
      const markdown = `
## বর্ণমালা লেআউট
### বিজয়ের রূপরেখা
## ভূমিকা ও পরিচিতি
`;
      const chapters = extractMarkdownChapters(markdown);
      expect(chapters).toEqual([
        { id: 'বর্ণমালা-লেআউট', title: 'বর্ণমালা লেআউট', level: 2 },
        { id: 'বিজয়ের-রূপরেখা', title: 'বিজয়ের রূপরেখা', level: 3 },
        { id: 'ভূমিকা-ও-পরিচিতি', title: 'ভূমিকা ও পরিচিতি', level: 2 },
      ]);
    });

    it('8. provides safe title and slug fallback for empty or symbol-only headings in AST extraction', () => {
      const markdown = ['', '## ???', '## Installation', '## ???', '##   ', ''].join('\n');
      const chapters = extractMarkdownChapters(markdown);
      expect(chapters).toEqual([
        { id: 'section', title: '???', level: 2 },
        { id: 'installation', title: 'Installation', level: 2 },
        { id: 'section-1', title: '???', level: 2 },
        { id: 'section-2', title: 'Untitled Section', level: 2 },
      ]);
    });
  });

  describe('DOM Parity & Raw HTML Heading Policy (MarkdownContent.tsx)', () => {
    it('13. excludes raw HTML headings from shifting Markdown heading slug sequence', () => {
      const markdown = `
## First Markdown Section

<h2>Raw HTML Un-indexed Heading</h2>

## Second Markdown Section
`;
      const chapters = extractMarkdownChapters(markdown);
      expect(chapters).toEqual([
        { id: 'first-markdown-section', title: 'First Markdown Section', level: 2 },
        { id: 'second-markdown-section', title: 'Second Markdown Section', level: 2 },
      ]);

      const { container } = render(React.createElement(MarkdownContent, { content: markdown }));
      const headings = container.querySelectorAll('h2');
      expect(headings).toHaveLength(3);
      expect(headings[0].getAttribute('id')).toBe('first-markdown-section');
      // Raw HTML heading does not receive an automatic slugger id
      expect(headings[1].getAttribute('id')).toBeNull();
      // Second markdown heading is second-markdown-section, NOT second-markdown-section-1
      expect(headings[2].getAttribute('id')).toBe('second-markdown-section');
    });

    it('14. guarantees exact 1-to-1 chapter ID and rendered DOM ID parity', () => {
      const markdown = `
# Project Main Heading

## Architecture
Overview of architecture.

## Architecture
Detailed architecture breakdown.

## বর্ণমালা লেআউট
Bengali script specification.

## ???
Mystery section.

### Installation
Setup guide.

### Installation
Docker setup guide.
`;
      const chapters = extractMarkdownChapters(markdown);
      const { container } = render(React.createElement(MarkdownContent, { content: markdown }));

      // Every single extracted chapter ID must exist in the rendered DOM with exact match
      chapters.forEach((chapter) => {
        const el = container.querySelector(`[id="${chapter.id}"]`);
        expect(el, `Expected DOM element for chapter ID "${chapter.id}"`).not.toBeNull();
      });

      // Confirm expected sequential IDs
      expect(chapters.map((c) => c.id)).toEqual([
        'architecture',
        'architecture-1',
        'বর্ণমালা-লেআউট',
        'section',
        'installation',
        'installation-1',
      ]);
    });
  });
});
