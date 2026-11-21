/**
 * Centralized, Deterministic Heading Slugger & Anchor Engine
 *
 * Invariants:
 * 1. Preserves Unicode letters (\p{L}), combining marks (\p{M} for Bengali vowels/hasant/diacritics),
 *    and numbers (\p{N}).
 * 2. Repeated headings receive sequential -1, -2 suffixes.
 * 3. Empty or punctuation-only headings use deterministic fallback 'section', 'section-1', etc.
 * 4. Reserved page-level IDs cannot collide with documentation headings.
 * 5. Provides identical allocator behavior across chapter extraction and DOM rendering.
 */

/**
 * Reserved static page anchor IDs that must never be assigned to upstream Markdown headings.
 */
export const RESERVED_PAGE_ANCHORS = [
  'gallery-heading',
  'architectural-overview',
  'system-architecture',
  'repository-documentation',
  'technical-documentation-heading',
  'technical-documentation-panel',
  'technical-documentation-toggle',
  'back-to-projects-bottom',
  'back-to-projects-top',
  'action-view-repository',
  'action-view-demo',
] as const;

/**
 * Pure Unicode-aware slugification function.
 * Preserves letters (\p{L}), combining marks (\p{M} for Bengali vowels/diacritics),
 * and numbers (\p{N}). Strips punctuation, collapses whitespace/hyphens, and trims edges.
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/[\uFE00-\uFE0F]/g, '') // Strip emoji variation selectors (e.g. \uFE0F in ⚠️)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, '')
    .replace(/[\s-]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

/**
 * Deterministic, stateful heading slugger.
 * Tracks occurrences and disambiguates collisions with sequential suffixes (-1, -2, etc.).
 */
export class HeadingSlugger {
  private seen: Set<string>;
  private counts: Map<string, number>;

  constructor(reservedIds: readonly string[] | string[] = RESERVED_PAGE_ANCHORS) {
    this.seen = new Set(reservedIds);
    this.counts = new Map();
  }

  public slug(rawText: string): string {
    let base = slugify(rawText);
    if (!base) {
      base = 'section';
    }

    const currentCount = this.counts.get(base) || 0;

    // First occurrence and not taken by reserved anchors
    if (currentCount === 0 && !this.seen.has(base)) {
      this.seen.add(base);
      this.counts.set(base, 1);
      return base;
    }

    // Collision resolution: find next available base-N
    let count = Math.max(currentCount, 1);
    while (true) {
      const candidate = `${base}-${count}`;
      count++;
      if (!this.seen.has(candidate)) {
        this.seen.add(candidate);
        this.counts.set(base, count);
        return candidate;
      }
    }
  }

  public reset(): void {
    this.seen.clear();
    this.counts.clear();
  }
}

/**
 * Universal unist node text extractor.
 * Operates recursively on both mdast (remark) and hast (rehype) trees.
 */
export function getNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { value?: string; children?: unknown[] };
  if (typeof n.value === 'string') return n.value;
  if (Array.isArray(n.children)) {
    return n.children.map(getNodeText).join('');
  }
  return '';
}
