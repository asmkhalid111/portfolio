import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseGitHubRepo,
  extractMarkdownChapters,
  rewriteMarkdownRelativeUrls,
  extractMarkdownImages,
  isBadgeUrl,
  validateDocPath,
  readBoundedResponse,
  getGitHubCaseStudy,
} from '@/lib/github/sync';

function createStreamFromChunks(chunks: Uint8Array[], onCancel?: () => void): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
    cancel() {
      if (onCancel) onCancel();
    },
  });
}

describe('GitHub Content Sync Engine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('parseGitHubRepo', () => {
    it('correctly parses standard GitHub repository URL', () => {
      const parsed = parseGitHubRepo('https://github.com/asmkhalid111/Web-Lan-Chat');
      expect(parsed).toEqual({ owner: 'asmkhalid111', repo: 'Web-Lan-Chat' });
    });

    it('strips trailing .git from repository URL', () => {
      const parsed = parseGitHubRepo('https://github.com/asmkhalid111/Web-Lan-Chat.git');
      expect(parsed).toEqual({ owner: 'asmkhalid111', repo: 'Web-Lan-Chat' });
    });

    it('strips deep subpaths cleanly', () => {
      const parsed = parseGitHubRepo('https://github.com/asmkhalid111/Web-Lan-Chat/tree/master/docs');
      expect(parsed).toEqual({ owner: 'asmkhalid111', repo: 'Web-Lan-Chat' });
    });

    it('rejects invalid or non-GitHub URLs', () => {
      expect(parseGitHubRepo('https://gitlab.com/asmkhalid111/repo')).toBeNull();
      expect(parseGitHubRepo('https://malicious.site/phishing')).toBeNull();
      expect(parseGitHubRepo('not-a-url')).toBeNull();
      expect(parseGitHubRepo('')).toBeNull();
      expect(parseGitHubRepo(null)).toBeNull();
      expect(parseGitHubRepo(undefined)).toBeNull();
    });

    it('rejects unsafe schemes and protocol injection', () => {
      expect(parseGitHubRepo('javascript:alert(1)')).toBeNull();
      expect(parseGitHubRepo('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(parseGitHubRepo('ftp://github.com/asmkhalid111/repo')).toBeNull();
      expect(parseGitHubRepo('file:///etc/passwd')).toBeNull();
    });

    it('rejects URLs with userinfo or port manipulation', () => {
      expect(parseGitHubRepo('https://user:pass@github.com/owner/repo')).toBeNull();
      expect(parseGitHubRepo('https://github.com:8080/owner/repo')).toBeNull();
    });

    it('rejects directory traversal attempts in repo URL', () => {
      expect(parseGitHubRepo('https://github.com/../evil')).toBeNull();
      expect(parseGitHubRepo('https://github.com/owner/..')).toBeNull();
      expect(parseGitHubRepo('https://github.com/./evil')).toBeNull();
      expect(parseGitHubRepo('https://github.com/owner/./evil')).toBeNull();
    });
  });

  describe('validateDocPath', () => {
    it('accepts valid default README.md and repo-relative Markdown paths', () => {
      expect(validateDocPath('README.md')).toEqual({ valid: true });
      expect(validateDocPath('docs/architecture.md')).toEqual({ valid: true });
      expect(validateDocPath('nested/specs/guide.markdown')).toEqual({ valid: true });
    });

    it('rejects absolute paths and backslashes', () => {
      expect(validateDocPath('/README.md').valid).toBe(false);
      expect(validateDocPath('\\README.md').valid).toBe(false);
      expect(validateDocPath('docs\\guide.md').valid).toBe(false);
      expect(validateDocPath('C:\\Windows\\System32.md').valid).toBe(false);
    });

    it('rejects directory traversal sequences in docPath', () => {
      expect(validateDocPath('../secret.md').valid).toBe(false);
      expect(validateDocPath('docs/../../secret.md').valid).toBe(false);
      expect(validateDocPath('./local.md').valid).toBe(false);
    });

    it('rejects encoded traversal sequences', () => {
      expect(validateDocPath('%2e%2e%2fsecret.md').valid).toBe(false);
      expect(validateDocPath('..%2fsecret.md').valid).toBe(false);
      expect(validateDocPath('%252e%252e%252fsecret.md').valid).toBe(false);
    });

    it('rejects URL schemes, query strings, and fragments', () => {
      expect(validateDocPath('https://evil.com/file.md').valid).toBe(false);
      expect(validateDocPath('javascript:alert(1)').valid).toBe(false);
      expect(validateDocPath('data:text/plain,hello.md').valid).toBe(false);
      expect(validateDocPath('README.md?query=1').valid).toBe(false);
      expect(validateDocPath('README.md#heading').valid).toBe(false);
    });

    it('rejects control characters and non-markdown file types', () => {
      expect(validateDocPath('README.md\0.txt').valid).toBe(false);
      expect(validateDocPath('package.json').valid).toBe(false);
      expect(validateDocPath('server.js').valid).toBe(false);
      expect(validateDocPath('').valid).toBe(false);
      expect(validateDocPath(null).valid).toBe(false);
    });
  });

  describe('extractMarkdownChapters', () => {
    it('extracts H2 and H3 chapters with slugified IDs', () => {
      const markdown = `
# Main Project Title (Ignored by chapter index)

Some lead content.

## Architecture & Design
Details about architecture.

### WebSocket Communication
Real-time messaging details.

## Automated Verification (SQA)
Test suite specifications.
`;
      const chapters = extractMarkdownChapters(markdown);
      expect(chapters).toEqual([
        { id: 'architecture-design', title: 'Architecture & Design', level: 2 },
        { id: 'websocket-communication', title: 'WebSocket Communication', level: 3 },
        { id: 'automated-verification-sqa', title: 'Automated Verification (SQA)', level: 2 },
      ]);
    });
  });

  describe('rewriteMarkdownRelativeUrls', () => {
    it('rewrites relative image markdown syntax to raw.githubusercontent.com', () => {
      const markdown = 'Here is the chat interface: ![Chat Screenshot](screenshot_chat.png)';
      const rewritten = rewriteMarkdownRelativeUrls(
        markdown,
        'asmkhalid111',
        'Web-Lan-Chat',
        'master'
      );
      expect(rewritten).toBe(
        'Here is the chat interface: ![Chat Screenshot](https://raw.githubusercontent.com/asmkhalid111/Web-Lan-Chat/master/screenshot_chat.png)'
      );
    });

    it('rewrites HTML img tags with relative paths', () => {
      const markdown = '<img src="./docs/diagram.png" alt="Architecture Diagram" />';
      const rewritten = rewriteMarkdownRelativeUrls(
        markdown,
        'asmkhalid111',
        'Web-Lan-Chat',
        'master'
      );
      expect(rewritten).toBe(
        '<img src="https://raw.githubusercontent.com/asmkhalid111/Web-Lan-Chat/master/docs/diagram.png" alt="Architecture Diagram" />'
      );
    });

    it('leaves absolute external images and links untouched', () => {
      const markdown = '![Badge](https://img.shields.io/badge/Python-3.9-blue.svg)';
      const rewritten = rewriteMarkdownRelativeUrls(
        markdown,
        'asmkhalid111',
        'Web-Lan-Chat',
        'master'
      );
      expect(rewritten).toBe(markdown);
    });
  });

  describe('isBadgeUrl', () => {
    it('detects shields.io and badge SVG URLs', () => {
      expect(isBadgeUrl('https://img.shields.io/badge/Python-3.9-blue.svg')).toBe(true);
      expect(isBadgeUrl('https://badgen.net/badge/license/MIT/blue')).toBe(true);
      expect(isBadgeUrl('https://github.com/org/repo/workflows/CI/badge.svg')).toBe(true);
      expect(isBadgeUrl('https://codecov.io/gh/org/repo/branch/master/graph/badge.svg')).toBe(true);
    });

    it('detects badge-like alt text on SVGs', () => {
      expect(isBadgeUrl('https://example.com/assets/ci.svg', 'Build Status')).toBe(true);
      expect(isBadgeUrl('https://example.com/assets/license.svg', 'License')).toBe(true);
    });

    it('permits genuine project screenshots and diagrams', () => {
      expect(isBadgeUrl('https://raw.githubusercontent.com/user/repo/master/screenshot.png')).toBe(false);
      expect(isBadgeUrl('https://raw.githubusercontent.com/user/repo/master/docs/architecture.jpg')).toBe(false);
      expect(isBadgeUrl('https://example.com/demo.gif')).toBe(false);
    });
  });

  describe('extractMarkdownImages', () => {
    it('extracts non-badge images from Markdown and HTML tags, deduplicating URLs', () => {
      const markdown = `
# Project Title
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://ci.example.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Here is a primary screenshot of the user interface:
![Global Chat Room](https://raw.githubusercontent.com/user/repo/master/screenshot_chat.png)

And an architectural diagram in HTML:
<img src="https://raw.githubusercontent.com/user/repo/master/docs/arch.png" alt="Architecture Diagram" />

A duplicate reference to the same screenshot:
![Duplicate Chat](https://raw.githubusercontent.com/user/repo/master/screenshot_chat.png)
`;

      const images = extractMarkdownImages(markdown);
      expect(images).toHaveLength(2);
      expect(images[0]).toEqual({
        src: 'https://raw.githubusercontent.com/user/repo/master/screenshot_chat.png',
        alt: 'Global Chat Room',
      });
      expect(images[1]).toEqual({
        src: 'https://raw.githubusercontent.com/user/repo/master/docs/arch.png',
        alt: 'Architecture Diagram',
      });
    });

    it('does NOT extract image syntax nested inside code blocks or inline code spans', () => {
      const markdownWithCode = `
# Engineering Guide

Here is an example in a fenced markdown code block:
\`\`\`markdown
![Sample in Code](https://example.com/code-sample.png)
\`\`\`

Here is an example in an indented code block:

    ![Indented Code](https://example.com/indented-sample.png)

Here is an example in inline backticks: \`![Inline Code](https://example.com/inline-sample.png)\`

Here is an HTML img example in a code block:
\`\`\`html
<img src="https://example.com/code-html.png" alt="Code HTML" />
\`\`\`

And an escaped markdown example:
\\!\\[Escaped Image\\](https://example.com/escaped.png)

Here is a genuine lead screenshot outside code:
![Authentic Screenshot](https://example.com/authentic.png)
`;

      const images = extractMarkdownImages(markdownWithCode);
      expect(images).toHaveLength(1);
      expect(images[0]).toEqual({
        src: 'https://example.com/authentic.png',
        alt: 'Authentic Screenshot',
      });
    });

    it('returns empty array when markdown contains no genuine screenshots', () => {
      const markdown = `
# Compiler Project
This project has no screenshots.
Just text, code blocks:
\`\`\`rust
fn main() {}
\`\`\`
[![CI](https://github.com/org/repo/actions/workflows/ci.yml/badge.svg)](link)
`;
      const images = extractMarkdownImages(markdown);
      expect(images).toEqual([]);
    });
  });

  describe('readBoundedResponse Streaming & Size Enforcement', () => {
    it('successfully streams and decodes a valid response below 512 KB', async () => {
      const sampleText = '# Valid Readme\nThis is a clean document within the size budget.';
      const encoded = new TextEncoder().encode(sampleText);
      const stream = createStreamFromChunks([encoded]);
      const response = new Response(stream, {
        status: 200,
        headers: { 'content-length': String(encoded.byteLength) },
      });

      const result = await readBoundedResponse(response, 512 * 1024);
      expect(result.ok).toBe(true);
      expect(result.text).toBe(sampleText);
    });

    it('rejects early when Content-Length exceeds limit without reading stream', async () => {
      let pullAttempted = false;
      const stream = new ReadableStream<Uint8Array>(
        {
          pull(controller) {
            pullAttempted = true;
            controller.enqueue(new Uint8Array(10));
            controller.close();
          },
        },
        { highWaterMark: 0 }
      );

      const response = new Response(stream, {
        status: 200,
        headers: { 'content-length': String(600 * 1024) }, // 600 KB
      });

      const result = await readBoundedResponse(response, 512 * 1024);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('exceeds maximum permitted size of 512 KB');
      expect(pullAttempted).toBe(false);
    });

    it('rejects oversized responses when Content-Length is missing and chunks exceed limit', async () => {
      const chunk300kb = new Uint8Array(300 * 1024);
      const stream = createStreamFromChunks([chunk300kb, chunk300kb]); // 600 KB total
      const response = new Response(stream, {
        status: 200,
        headers: {}, // No content-length header
      });

      const result = await readBoundedResponse(response, 512 * 1024);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('exceeds maximum permitted size of 512 KB');
    });

    it('rejects when Content-Length is falsely underreported but streaming chunks exceed limit', async () => {
      const chunk300kb = new Uint8Array(300 * 1024);
      const stream = createStreamFromChunks([chunk300kb, chunk300kb]);
      const response = new Response(stream, {
        status: 200,
        headers: { 'content-length': '1024' }, // Falsely claims 1 KB
      });

      const result = await readBoundedResponse(response, 512 * 1024);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('exceeds maximum permitted size of 512 KB');
    });

    it('cancels stream reader immediately upon exceeding limit to prevent further data buffering', async () => {
      let cancelCalled = false;
      const chunk300kb = new Uint8Array(300 * 1024);
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(chunk300kb);
        },
        cancel() {
          cancelCalled = true;
        },
      });
      const response = new Response(stream, { status: 200 });

      const result = await readBoundedResponse(response, 512 * 1024);
      expect(result.ok).toBe(false);
      expect(cancelCalled).toBe(true);
    });

    it('handles network failure mid-stream gracefully', async () => {
      const failingStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('# Initial Header\n'));
          controller.error(new Error('Connection reset by peer'));
        },
      });
      const response = new Response(failingStream, { status: 200 });

      const result = await readBoundedResponse(response, 512 * 1024);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Connection reset by peer');
    });

    it('accurately counts UTF-8 multi-byte characters such as Bengali text by bytes rather than string length', async () => {
      // 'বর্ণমালা' is 8 characters long, but 24 bytes in UTF-8 (3 bytes per char)
      const bengaliWord = 'বর্ণমালা';
      const repeatCount = 23000;
      const sample = bengaliWord.repeat(repeatCount); // 184,000 chars (< 512,000), but 552,000 bytes (> 512 KB)
      const encoded = new TextEncoder().encode(sample);

      expect(sample.length).toBeLessThan(512 * 1024); // JavaScript string length is only ~184k
      expect(encoded.byteLength).toBeGreaterThan(512 * 1024); // Byte length is ~552 KB

      const stream = createStreamFromChunks([encoded]);
      const response = new Response(stream, { status: 200 });

      const result = await readBoundedResponse(response, 512 * 1024);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('exceeds maximum permitted size of 512 KB');
    });

    it('fails safely with structured error when response body is not a readable stream', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        body: null,
      } as unknown as Response;

      const result = await readBoundedResponse(mockResponse, 512 * 1024);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Response body stream is unavailable');
    });
  });

  describe('getGitHubCaseStudy Network Resilience', () => {
    it('results in zero network requests when docPath is rejected', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await getGitHubCaseStudy(
        'https://github.com/asmkhalid111/Web-Lan-Chat',
        '../../secret.md'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Path traversal');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('falls back from master to main branch when master returns 404', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('/master/')) {
          return new Response('Not Found', { status: 404, statusText: 'Not Found' });
        }
        if (urlStr.includes('/main/')) {
          return new Response('# Synced Documentation on Main', {
            status: 200,
            headers: { 'content-type': 'text/plain' },
          });
        }
        return new Response('Not Found', { status: 404 });
      });

      const result = await getGitHubCaseStudy('https://github.com/asmkhalid111/Web-Lan-Chat');
      expect(result.success).toBe(true);
      expect(result.defaultBranch).toBe('main');
      expect(result.rawMarkdown).toContain('# Synced Documentation on Main');
    });

    it('returns structured error when rate-limited (HTTP 403) without throwing unhandled exceptions', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Rate Limit Exceeded', {
          status: 403,
          statusText: 'Forbidden',
        })
      );

      const result = await getGitHubCaseStudy('https://github.com/asmkhalid111/Web-Lan-Chat');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not retrieve README.md from GitHub repository');
    });

    it('returns structured error when upstream server fails (HTTP 500)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        })
      );

      const result = await getGitHubCaseStudy('https://github.com/asmkhalid111/Web-Lan-Chat');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not retrieve README.md');
    });

    it('handles request timeout / AbortError gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new DOMException('The operation was aborted', 'AbortError')
      );

      const result = await getGitHubCaseStudy('https://github.com/asmkhalid111/Web-Lan-Chat');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not retrieve README.md');
    });

    it('terminates stalled response body stream via timeout without hanging indefinitely', async () => {
      vi.useFakeTimers();

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes('/main/')) {
          return new Response('Not Found', { status: 404 });
        }

        const signal = init?.signal as AbortSignal | undefined;
        const streamWithSignal = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('# Stalled Stream Header\n'));
            if (signal) {
              signal.addEventListener('abort', () => {
                controller.error(new DOMException('The operation was aborted', 'AbortError'));
              });
            }
          },
        });
        return new Response(streamWithSignal, { status: 200 });
      });

      const promise = getGitHubCaseStudy('https://github.com/asmkhalid111/Web-Lan-Chat');

      // Advance fake timers past FETCH_TIMEOUT_MS (8000ms)
      await vi.advanceTimersByTimeAsync(8500);

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not retrieve README.md from GitHub repository');

      vi.useRealTimers();
    });
  });
});
