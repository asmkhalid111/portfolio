import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import {
  HeadingSlugger,
  getNodeText,
  RESERVED_PAGE_ANCHORS,
  slugify,
} from '@/lib/case-studies/slugger';

/**
 * Server-Side GitHub Documentation Resolver & Safe Content Synchronizer
 * 
 * Strict invariants:
 * 1. Strictly validates repository URL (must match https://github.com/:owner/:repo).
 * 2. Only approved host: github.com.
 * 3. Resolves branch with fallback (master / main).
 * 4. Rewrites relative images & links to raw.githubusercontent.com / github.com blob paths.
 * 5. Request timeout via AbortSignal and 500 KB payload ceiling.
 * 6. Never throws unhandled errors; returns structured fallbacks.
 * 7. Server-only execution.
 */

export interface GitHubChapter {
  id: string;
  title: string;
  level: number;
}

export interface GitHubImage {
  src: string;
  alt: string;
}

export interface GitHubDocumentResult {
  success: boolean;
  rawMarkdown: string;
  sourceUrl: string;
  defaultBranch: string;
  chapters: GitHubChapter[];
  extractedImages: GitHubImage[];
  error?: string;
}

const GITHUB_URL_PATTERN = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/;
const MAX_CONTENT_BYTES = 512 * 1024; // 512 KB payload limit
const FETCH_TIMEOUT_MS = 8000; // 8-second timeout

/**
 * Validates document path before constructing any GitHub requests.
 * Rejects traversal, absolute paths, backslashes, schemes, and non-markdown extensions.
 */
export function validateDocPath(docPath: string | null | undefined): { valid: boolean; error?: string } {
  if (!docPath || typeof docPath !== 'string') {
    return { valid: false, error: 'Document path is required.' };
  }

  const trimmed = docPath.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Document path cannot be empty.' };
  }

  // Reject control characters (0x00-0x1F, 0x7F)
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return { valid: false, error: 'Document path contains invalid control characters.' };
  }

  // Reject query parameters or URL fragment injection
  if (/[?#]/.test(trimmed)) {
    return { valid: false, error: 'Query parameters and fragments are not permitted in document paths.' };
  }

  // Reject URL schemes (http:, https:, javascript:, data:, file:, etc.) and Windows drive letters (C:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return { valid: false, error: 'Absolute URL schemes are not permitted in document paths.' };
  }

  // Reject absolute paths starting with / or \
  if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
    return { valid: false, error: 'Absolute paths are not permitted in document paths.' };
  }

  // Reject backslashes completely to prevent Windows-style traversal
  if (trimmed.includes('\\')) {
    return { valid: false, error: 'Backslash path separators are not permitted.' };
  }

  // Handle URL-encoding (e.g. %2e%2e, %2f, %5c, nested %252e)
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return { valid: false, error: 'Malformed percent-encoding in document path.' };
  }

  if (decoded.includes('%')) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return { valid: false, error: 'Malformed nested percent-encoding in document path.' };
    }
  }

  // Check for backslashes in decoded path
  if (decoded.includes('\\')) {
    return { valid: false, error: 'Backslash path separators are not permitted.' };
  }

  // Check for directory traversal sequences (..) in decoded path
  const segments = decoded.split('/');
  for (const segment of segments) {
    if (segment === '..' || segment === '.' || segment.includes('..')) {
      return { valid: false, error: 'Path traversal sequences (..) are not permitted.' };
    }
  }

  // Enforce supported Markdown extensions
  if (!/\.(?:md|markdown|mdown|mkdn)$/i.test(trimmed)) {
    return { valid: false, error: 'Only Markdown document files (.md, .markdown) are supported.' };
  }

  return { valid: true };
}

/**
 * Extracts verified owner and repository name from a GitHub URL.
 */
export function parseGitHubRepo(url: string | null | undefined): { owner: string; repo: string } | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(GITHUB_URL_PATTERN);
  if (!match) return null;

  const owner = match[1];
  let repo = match[2];
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }

  // Reject traversal or suspicious tokens
  if (
    owner.includes('..') ||
    repo.includes('..') ||
    owner.includes('/') ||
    repo.includes('/') ||
    owner === '.' ||
    repo === '.' ||
    owner === '..' ||
    repo === '..'
  ) {
    return null;
  }

  return { owner, repo };
}

const markdownProcessor = unified().use(remarkParse);

/**
 * Generates URL-friendly anchor slug from heading text.
 */
export function slugifyHeading(text: string): string {
  return slugify(text);
}

/**
 * Extracts table of contents chapters from markdown headings (H2 and H3)
 * using unified/remark AST parsing. Fenced code blocks are excluded,
 * and heading IDs are assigned in exact document order with duplicate suffixes.
 */
export function extractMarkdownChapters(markdown: string): GitHubChapter[] {
  if (!markdown || typeof markdown !== 'string') return [];

  const chapters: GitHubChapter[] = [];
  const slugger = new HeadingSlugger(RESERVED_PAGE_ANCHORS);

  try {
    const tree = markdownProcessor.parse(markdown);

    visit(tree, 'heading', (node: { depth: number; children: unknown[] }) => {
      const text = getNodeText(node);
      const title = text.trim() || 'Untitled Section';

      // Register every participating heading level (H1-H6) with the slugger in document order
      // to guarantee exact ID count alignment with DOM rendering.
      const id = slugger.slug(text);

      // Include only H2 and H3 in the chapter index
      if (node.depth === 2 || node.depth === 3) {
        chapters.push({
          id,
          title,
          level: node.depth,
        });
      }
    });
  } catch (err) {
    console.warn('[GitHubSync] Failed to parse markdown AST for chapter extraction:', err);
  }

  return chapters;
}

/**
 * Resolves a document-relative path against the document's containing directory
 * and confines the resulting normalized path to the repository root.
 */
export function resolveRepoRelativePath(
  relativePath: string | null | undefined,
  docPath: string = 'README.md'
): { type: 'anchor' | 'absolute' | 'unsafe' | 'escaped' | 'resolved'; path: string } | null {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const trimmed = relativePath.trim();
  if (trimmed.length === 0) return null;

  // In-page hash fragments
  if (trimmed.startsWith('#')) {
    return { type: 'anchor', path: trimmed };
  }

  // Legitimate absolute URLs or protocol-relative URLs
  if (/^(?:https?:|\/\/)/i.test(trimmed)) {
    return { type: 'absolute', path: trimmed };
  }

  // Reject unsafe schemes (javascript:, data:, file:, vbscript:, etc.) or other schemes
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return { type: 'unsafe', path: trimmed };
  }

  // Determine document directory base (e.g. docs/architecture/spec.md -> docs/architecture)
  const cleanDoc = (docPath || 'README.md').trim().replace(/^\.?\//, '');
  const lastSlash = cleanDoc.lastIndexOf('/');
  const docDir = lastSlash !== -1 ? cleanDoc.substring(0, lastSlash) : '';

  // Separate path part from query parameters and hash fragments
  let pathPart = trimmed;
  let suffix = '';
  const qIdx = pathPart.indexOf('?');
  const hIdx = pathPart.indexOf('#');
  const splitIdx =
    qIdx !== -1 && hIdx !== -1
      ? Math.min(qIdx, hIdx)
      : qIdx !== -1
      ? qIdx
      : hIdx;
  if (splitIdx !== -1) {
    suffix = pathPart.substring(splitIdx);
    pathPart = pathPart.substring(0, splitIdx);
  }

  // Paths starting with '/' are repo-root absolute
  const isRootAbsolute = pathPart.startsWith('/');
  const segments: string[] = (!isRootAbsolute && docDir) ? docDir.split('/') : [];
  const parts = pathPart.split('/');

  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (segments.length > 0) {
        segments.pop();
      } else {
        // Escaped repository root
        return { type: 'escaped', path: trimmed };
      }
    } else {
      segments.push(part);
    }
  }

  const resolved = segments.join('/') + suffix;
  return { type: 'resolved', path: resolved };
}

function getCodeIntervals(content: string): [number, number][] {
  const intervals: [number, number][] = [];
  try {
    const tree = markdownProcessor.parse(content);
    visit(
      tree,
      (node: {
        type: string;
        position?: { start?: { offset?: number }; end?: { offset?: number } };
      }) => {
        if (
          (node.type === 'code' || node.type === 'inlineCode') &&
          node.position?.start?.offset !== undefined &&
          node.position?.end?.offset !== undefined
        ) {
          intervals.push([node.position.start.offset, node.position.end.offset]);
        }
      }
    );
  } catch (err) {
    console.warn('[GitHubSync] AST parse error in relative URL rewriting:', err);
  }
  return intervals;
}

/**
 * Rewrites relative images, GIFs, and anchor links in Markdown to verified GitHub absolute URLs,
 * resolving paths against the directory of the target Markdown document while protecting code blocks.
 */
export function rewriteMarkdownRelativeUrls(
  markdown: string,
  owner: string,
  repo: string,
  branch: string,
  docPath: string = 'README.md'
): string {
  if (!markdown || typeof markdown !== 'string') return '';

  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;
  const blobBase = `https://github.com/${owner}/${repo}/blob/${branch}`;

  // 1. Rewrite Markdown image syntax: ![alt](relative_path.png)
  let codeRanges = getCodeIntervals(markdown);
  let transformed = markdown.replace(
    /(!\[(.*?)\]\()\s*([^\s)]+)(\s*(?:["'][^"']*["'])?\s*\))/g,
    (fullMatch, pre, alt, relativePath, post, offset) => {
      if (codeRanges.some(([start, end]) => offset >= start && offset < end)) {
        return fullMatch;
      }
      const res = resolveRepoRelativePath(relativePath, docPath);
      if (res && res.type === 'resolved') {
        return `${pre}${rawBase}/${res.path}${post}`;
      }
      return fullMatch;
    }
  );

  // 2. Rewrite HTML <img> tags with relative src: <img src="relative_path.png" ... />
  codeRanges = getCodeIntervals(transformed);
  transformed = transformed.replace(
    /(<img\s+[^>]*?src=["'])([^"']+)(["'][^>]*?\/?>)/gi,
    (fullMatch, pre, relativePath, post, offset) => {
      if (codeRanges.some(([start, end]) => offset >= start && offset < end)) {
        return fullMatch;
      }
      const res = resolveRepoRelativePath(relativePath, docPath);
      if (res && res.type === 'resolved') {
        return `${pre}${rawBase}/${res.path}${post}`;
      }
      return fullMatch;
    }
  );

  // 3. Rewrite relative anchor links: [text](docs/path.md) -> github.com/:owner/:repo/blob/:branch/docs/path.md
  codeRanges = getCodeIntervals(transformed);
  transformed = transformed.replace(
    /((?:^|[^!])\[(.*?)\]\()\s*([^\s)]+)(\s*(?:["'][^"']*["'])?\s*\))/g,
    (fullMatch, pre, text, relativePath, post, offset) => {
      if (codeRanges.some(([start, end]) => offset >= start && offset < end)) {
        return fullMatch;
      }
      const res = resolveRepoRelativePath(relativePath, docPath);
      if (res && res.type === 'resolved') {
        return `${pre}${blobBase}/${res.path}${post}`;
      }
      return fullMatch;
    }
  );

  return transformed;
}

const BADGE_URL_PATTERNS = [
  /shields\.io/i,
  /badge\.svg/i,
  /\/badge\//i,
  /\.shields\./i,
  /badgen\.net/i,
  /codecov\.io/i,
  /travis-ci\./i,
  /coveralls\.io/i,
  /workflows\/.*badge/i,
  /actions\/workflows\/.*badge/i,
];

/**
 * Detects whether an image URL or alt text indicates a CI status badge / shield rather than a project screenshot.
 */
export function isBadgeUrl(url: string, alt: string = ''): boolean {
  if (BADGE_URL_PATTERNS.some((pattern) => pattern.test(url))) {
    return true;
  }
  const cleanAlt = alt.trim().toLowerCase();
  if (
    /^(?:badge|build|status|license|coverage|ci|build\s+status|ci\s+status|actions\s+status|test\s+status)$/i.test(cleanAlt) &&
    url.toLowerCase().endsWith('.svg')
  ) {
    return true;
  }
  return false;
}

/**
 * Extracts authentic non-badge project screenshots and diagrams from Markdown and HTML img tags
 * using the unified/remark AST parser. Automatically ignores image syntax inside fenced code blocks,
 * indented code, inline code spans, and escaped markdown.
 */
export function extractMarkdownImages(markdown: string): GitHubImage[] {
  if (!markdown || typeof markdown !== 'string') return [];

  const images: GitHubImage[] = [];
  const seenUrls = new Set<string>();

  try {
    const tree = markdownProcessor.parse(markdown);

    visit(tree, (node: { type: string; url?: string; alt?: string | null; value?: string }) => {
      // 1. Genuine Markdown image AST node (AST automatically excludes code blocks & inline code)
      if (node.type === 'image' && typeof node.url === 'string') {
        const src = node.url.trim();
        const alt = typeof node.alt === 'string' ? node.alt.trim() : '';

        if (src.length > 0 && !seenUrls.has(src) && !isBadgeUrl(src, alt)) {
          seenUrls.add(src);
          images.push({ src, alt });
        }
      }

      // 2. Permitted raw HTML image elements (outside code blocks)
      if (node.type === 'html' && typeof node.value === 'string') {
        const html = node.value;
        const htmlImgRegex = /<img\s+[^>]*?src=["'](https?:\/\/[^"'\s]+)["'][^>]*?\/?>/gi;
        let match: RegExpExecArray | null;
        while ((match = htmlImgRegex.exec(html)) !== null) {
          const fullTag = match[0];
          const src = match[1].trim();
          const altMatch = fullTag.match(/alt=["']([^"']*)["']/i);
          const alt = altMatch ? altMatch[1].trim() : '';

          if (src.length > 0 && !seenUrls.has(src) && !isBadgeUrl(src, alt)) {
            seenUrls.add(src);
            images.push({ src, alt });
          }
        }
      }
    });
  } catch (err) {
    console.warn('[GitHubSync] Failed to parse markdown AST for image extraction:', err);
  }

  return images;
}

/**
 * Reads a fetch Response body stream bounded to maxBytes, counting raw binary byte lengths.
 * If cumulative bytes exceed maxBytes, cancels the reader, aborts the request, and rejects.
 * Fails safely if response.body stream is unavailable.
 */
export async function readBoundedResponse(
  response: Response,
  maxBytes: number,
  controller?: AbortController
): Promise<{ ok: boolean; text: string; error?: string }> {
  // 1. Fast pre-check: inspect Content-Length header if present
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null) {
    const parsedLen = Number(contentLength);
    if (Number.isFinite(parsedLen) && parsedLen > maxBytes) {
      if (controller) {
        controller.abort();
      }
      return {
        ok: false,
        text: '',
        error: `Remote document exceeds maximum permitted size of ${maxBytes / 1024} KB.`,
      };
    }
  }

  // 2. Stream-based bounded read (chunk-by-chunk byte counting)
  if (!response.body || typeof response.body.getReader !== 'function') {
    return {
      ok: false,
      text: '',
      error: 'Response body stream is unavailable or cannot be read in a bounded manner.',
    };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          // Immediately cancel reader and abort network request
          try {
            await reader.cancel('Payload budget exceeded');
          } catch {
            // Ignore cancellation failure; controller.abort will sever connection
          }
          if (controller) {
            controller.abort();
          }
          return {
            ok: false,
            text: '',
            error: `Remote document exceeds maximum permitted size of ${maxBytes / 1024} KB.`,
          };
        }
        chunks.push(value);
      }
    }
  } catch (err: unknown) {
    const isAbort =
      (err instanceof Error && err.name === 'AbortError') ||
      (typeof err === 'object' && err !== null && 'name' in err && (err as { name: string }).name === 'AbortError') ||
      Boolean(controller?.signal?.aborted);

    if (isAbort) {
      throw new DOMException('The operation was aborted', 'AbortError');
    }
    return {
      ok: false,
      text: '',
      error: err instanceof Error && err.message ? err.message : 'Stream read failure occurred.',
    };
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Ignore if lock already released or closed
    }
  }

  // Concatenate chunks and decode as UTF-8
  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder('utf-8').decode(combined);
  return { ok: true, text };
}

/**
 * Resolves and fetches raw README.md (or custom path) from GitHub with caching and timeout.
 */
export async function getGitHubCaseStudy(
  repositoryUrl: string | null | undefined,
  docPath: string = 'README.md'
): Promise<GitHubDocumentResult> {
  const repoInfo = parseGitHubRepo(repositoryUrl);
  if (!repoInfo) {
    return {
      success: false,
      rawMarkdown: '',
      sourceUrl: repositoryUrl || '',
      defaultBranch: 'master',
      chapters: [],
      extractedImages: [],
      error: 'Invalid or missing GitHub repository URL.',
    };
  }

  // Pre-validate document path to ensure zero network requests for malicious paths
  const pathValidation = validateDocPath(docPath);
  if (!pathValidation.valid) {
    return {
      success: false,
      rawMarkdown: '',
      sourceUrl: repositoryUrl || '',
      defaultBranch: 'master',
      chapters: [],
      extractedImages: [],
      error: pathValidation.error || 'Invalid or insecure document path specified.',
    };
  }

  const { owner, repo } = repoInfo;

  // Test candidate default branches: master then main
  const candidateBranches = ['master', 'main'];
  let successfulBranch = 'master';
  let rawText = '';
  let fetched = false;

  for (const branch of candidateBranches) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${docPath}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(rawUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'text/plain, text/markdown, text/x-markdown',
          'User-Agent': 'KhalidPortfolio-CaseStudySync/1.0',
        },
        next: {
          revalidate: 3600, // Cache for 1 hour in Next.js Data Cache
          tags: [`github-${owner}-${repo}`],
        },
      });

      if (response.ok) {
        const streamResult = await readBoundedResponse(response, MAX_CONTENT_BYTES, controller);
        if (!streamResult.ok) {
          return {
            success: false,
            rawMarkdown: '',
            sourceUrl: rawUrl,
            defaultBranch: branch,
            chapters: [],
            extractedImages: [],
            error:
              streamResult.error ||
              `Remote document exceeds maximum permitted size of ${MAX_CONTENT_BYTES / 1024} KB.`,
          };
        }

        rawText = streamResult.text;
        successfulBranch = branch;
        fetched = true;
        break;
      }
    } catch (err: unknown) {
      const isAbort =
        (err instanceof Error && err.name === 'AbortError') ||
        (typeof err === 'object' && err !== null && 'name' in err && (err as { name: string }).name === 'AbortError') ||
        Boolean(controller.signal.aborted);

      if (isAbort) {
        console.warn(`[GitHubSync] Request to ${rawUrl} timed out after ${FETCH_TIMEOUT_MS}ms.`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (!fetched || !rawText) {
    return {
      success: false,
      rawMarkdown: '',
      sourceUrl: `https://github.com/${owner}/${repo}`,
      defaultBranch: 'master',
      chapters: [],
      extractedImages: [],
      error: `Could not retrieve ${docPath} from GitHub repository (${owner}/${repo}).`,
    };
  }

  // Rewrite all relative images and links to valid raw GitHub URLs
  const rewrittenMarkdown = rewriteMarkdownRelativeUrls(rawText, owner, repo, successfulBranch, docPath);
  const chapters = extractMarkdownChapters(rewrittenMarkdown);
  const extractedImages = extractMarkdownImages(rewrittenMarkdown);

  return {
    success: true,
    rawMarkdown: rewrittenMarkdown,
    sourceUrl: `https://github.com/${owner}/${repo}/blob/${successfulBranch}/${docPath}`,
    defaultBranch: successfulBranch,
    chapters,
    extractedImages,
  };
}
