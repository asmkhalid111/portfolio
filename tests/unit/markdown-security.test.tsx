import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarkdownContent } from '@/components/case-study/MarkdownContent';

describe('MarkdownContent Security and Sanitization Engine', () => {
  it('removes <script> elements and prevents execution of inline scripts', () => {
    const malicious = `
# Title
<script>window.__xss_injected = true;</script>
Normal text after script.
`;
    const { container } = render(<MarkdownContent content={malicious} />);

    // Must not exist in rendered DOM
    expect(container.querySelector('script')).toBeNull();
    // In normal DOM, window should not have been mutated
    expect((window as unknown as { __xss_injected?: boolean }).__xss_injected).toBeUndefined();
    expect(screen.getByText('Normal text after script.')).toBeDefined();
  });

  it('removes <iframe> elements', () => {
    const malicious = `
# Embedded Frame
<iframe src="https://attacker.site/phishing" width="500" height="300"></iframe>
Frame above should be stripped.
`;
    const { container } = render(<MarkdownContent content={malicious} />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText('Frame above should be stripped.')).toBeDefined();
  });

  it('strips dangerous HTML event-handler attributes (onerror, onload, onclick)', () => {
    const malicious = `
<img src="https://example.com/pic.png" onerror="alert('onerror')" onload="alert('onload')" onclick="alert('onclick')" alt="Vector" />
<a href="https://example.com" onclick="alert('click')">Safe Text</a>
`;
    const { container } = render(<MarkdownContent content={malicious} />);
    const img = container.querySelector('img');
    const a = container.querySelector('a');

    expect(img).not.toBeNull();
    expect(img?.getAttribute('onerror')).toBeNull();
    expect(img?.getAttribute('onload')).toBeNull();
    expect(img?.getAttribute('onclick')).toBeNull();

    expect(a).not.toBeNull();
    expect(a?.getAttribute('onclick')).toBeNull();
  });

  it('disarms or strips javascript: links in Markdown and HTML syntax', () => {
    const malicious = `
[Malicious Link 1](javascript:alert(1))
<a href="javascript:alert(2)">Malicious Link 2</a>
[Safe Link](https://github.com/example/repo)
`;
    const { container } = render(<MarkdownContent content={malicious} />);
    const links = container.querySelectorAll('a');

    for (const link of links) {
      const href = link.getAttribute('href');
      if (href) {
        expect(href.toLowerCase().startsWith('javascript:')).toBe(false);
      }
    }

    expect(screen.getByText('Safe Link').closest('a')?.getAttribute('href')).toBe(
      'https://github.com/example/repo'
    );
  });

  it('disarms unsafe data: URLs in links and image tags', () => {
    const malicious = `
[Data Link](data:text/html,<script>alert(1)</script>)
<img src="data:image/svg+xml,<svg onload=alert(1)>" alt="SVG XSS" />
`;
    const { container } = render(<MarkdownContent content={malicious} />);
    const link = container.querySelector('a');
    const img = container.querySelector('img');

    if (link) {
      const href = link.getAttribute('href');
      expect(!href || !href.startsWith('data:')).toBe(true);
    }

    if (img) {
      const src = img.getAttribute('src');
      expect(!src || !src.startsWith('data:image/svg+xml')).toBe(true);
    }
  });

  it('correctly renders permitted normal Markdown formatting', () => {
    const markdown = `
# Primary Heading
## Secondary Heading
### Tertiary Heading

This is a paragraph with **bold text**, *italic text*, and \`inline code\`.

- Unordered item 1
- Unordered item 2

1. Ordered item 1
2. Ordered item 2

> Blockquote citation

\`\`\`typescript
const greeting = "hello world";
console.log(greeting);
\`\`\`

| Header A | Header B |
| :--- | :--- |
| Val 1 | Val 2 |
`;

    const { container } = render(<MarkdownContent content={markdown} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Primary Heading' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Secondary Heading' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 3, name: 'Tertiary Heading' })).toBeDefined();
    expect(screen.getByText('bold text')).toBeDefined();
    expect(screen.getByText('Unordered item 1')).toBeDefined();
    expect(screen.getByText('Ordered item 1')).toBeDefined();
    expect(container.querySelector('blockquote')).not.toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('pre code')).not.toBeNull();
  });

  it('renders legitimate README screenshots and external images', () => {
    const markdown = `
![Chat UI Screenshot](https://raw.githubusercontent.com/user/repo/master/screenshot_chat.png)
<img src="https://raw.githubusercontent.com/user/repo/master/screenshot_login.png" alt="Login UI Screenshot" />
`;
    render(<MarkdownContent content={markdown} />);

    expect(screen.getByAltText('Chat UI Screenshot')).toBeDefined();
    expect(screen.getByAltText('Login UI Screenshot')).toBeDefined();
  });

  it('suppresses inline images whose URLs are promoted to top gallery and leaves no empty <p> wrapper', () => {
    const markdown = `
Paragraph before promoted image.

![Promoted Hero](https://example.com/promoted-hero.png)

Paragraph after promoted image.
`;
    const { container } = render(
      <MarkdownContent
        content={markdown}
        promotedImageUrls={['https://example.com/promoted-hero.png']}
      />
    );

    // Image must not exist
    expect(screen.queryByAltText('Promoted Hero')).toBeNull();

    // Verify exactly 2 paragraphs exist (before and after), with 0 empty paragraphs in between
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].textContent).toContain('Paragraph before promoted image.');
    expect(paragraphs[1].textContent).toContain('Paragraph after promoted image.');
  });
});
