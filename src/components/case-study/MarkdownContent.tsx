import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { visit } from 'unist-util-visit';
import {
  HeadingSlugger,
  getNodeText,
  RESERVED_PAGE_ANCHORS,
} from '@/lib/case-studies/slugger';
import { ArrowUpRight } from 'lucide-react';

export interface MarkdownContentProps {
  content: string;
  promotedImageUrls?: string[];
}

/**
 * Remark plugin that marks genuine Markdown heading nodes before HAST conversion.
 * Raw HTML headings (<h1-h6>) bypass this visitor, allowing the rehype slugger
 * to allocate IDs strictly to Markdown headings and keep parity with chapter extraction.
 */
function remarkTagHeadings() {
  return (tree: unknown) => {
    visit(tree as Parameters<typeof visit>[0], 'heading', (node: { data?: Record<string, unknown> }) => {
      node.data = node.data || {};
      const hProps = (node.data.hProperties || {}) as Record<string, unknown>;
      hProps['data-md-heading'] = 'true';
      node.data.hProperties = hProps;
    });
  };
}

// Customize sanitize schema to allow styling classes and attributes for clean markdown
const customSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] || []),
      'className',
      'align',
      'id',
      'data-md-heading',
      'dataMdHeading',
    ],
    img: [...(defaultSchema.attributes?.img || []), 'src', 'alt', 'width', 'height', 'loading'],
    a: [...(defaultSchema.attributes?.a || []), 'href', 'target', 'rel'],
  },
};

/**
 * Rehype plugin executed strictly AFTER rehypeSanitize.
 * Allocates unique, deterministic heading IDs to Markdown headings in exact document order
 * using the shared HeadingSlugger, ensuring 100% parity with chapter extraction.
 * Raw HTML headings are excluded from automatic slug allocation to prevent sequence drift.
 */
function rehypeHeadingSlug() {
  return (tree: unknown) => {
    const slugger = new HeadingSlugger(RESERVED_PAGE_ANCHORS);
    visit(
      tree as Parameters<typeof visit>[0],
      'element',
      (node: { tagName: string; properties?: Record<string, unknown> }) => {
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName)) {
          const props = node.properties || {};
          if (props.dataMdHeading === 'true' || props['data-md-heading'] === 'true') {
            const text = getNodeText(node);
            const id = slugger.slug(text);
            props.id = id;
            delete props.dataMdHeading;
            delete props['data-md-heading'];
          }
        }
      }
    );
  };
}

function isChildRenderable(child: React.ReactNode, promotedUrls: string[]): boolean {
  if (child === null || child === undefined || child === false) return false;
  if (typeof child === 'string') return child.trim().length > 0;
  if (typeof child === 'number') return true;
  if (React.isValidElement(child)) {
    const props = child.props as { src?: string; children?: React.ReactNode };
    if (props && typeof props.src === 'string' && promotedUrls.includes(props.src)) {
      return false;
    }
    if (props && props.children) {
      return React.Children.toArray(props.children).some((c) => isChildRenderable(c, promotedUrls));
    }
    return true;
  }
  return false;
}

export function MarkdownContent({ content, promotedImageUrls = [] }: MarkdownContentProps) {
  if (!content || !content.trim()) {
    return null;
  }

  return (
    <div className="case-study-prose max-w-none text-zinc-800 dark:text-zinc-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkTagHeadings]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, customSanitizeSchema], rehypeHeadingSlug]}
        components={{
          h1({ id, children }) {
            return (
              <h1
                id={id}
                className="scroll-mt-28 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 mt-10 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800"
              >
                {children}
              </h1>
            );
          },
          h2({ id, children }) {
            return (
              <h2
                id={id}
                className="scroll-mt-28 text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mt-10 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800"
              >
                {children}
              </h2>
            );
          },
          h3({ id, children }) {
            return (
              <h3
                id={id}
                className="scroll-mt-28 text-lg sm:text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-8 mb-3"
              >
                {children}
              </h3>
            );
          },
          h4({ id, children }) {
            return (
              <h4
                id={id}
                className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-6 mb-2"
              >
                {children}
              </h4>
            );
          },
          p({ children }) {
            const childArray = React.Children.toArray(children);
            const hasRenderableContent = childArray.some((child) =>
              isChildRenderable(child, promotedImageUrls)
            );
            if (!hasRenderableContent) {
              return null;
            }
            return (
              <p className="text-base sm:text-lg leading-relaxed text-zinc-700 dark:text-zinc-300 my-4">
                {children}
              </p>
            );
          },
          ul({ children }) {
            return (
              <ul className="list-disc pl-6 space-y-2 my-4 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal pl-6 space-y-2 my-4 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="pl-1">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 rounded-r-xl px-5 py-3 my-6 italic text-zinc-700 dark:text-zinc-300">
                {children}
              </blockquote>
            );
          },
          code({ className, children, ...props }) {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code
                  className={`font-mono text-sm leading-relaxed text-zinc-100 ${className || ''}`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="font-mono text-xs sm:text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return (
              <div className="relative my-6 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-lg">
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs font-mono text-zinc-400">
                  <span>Terminal / Code</span>
                </div>
                <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-zinc-200 leading-relaxed">
                  {children}
                </pre>
              </div>
            );
          },
          table({ children }) {
            return (
              <div className="my-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <table className="w-full text-left text-sm border-collapse">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">{children}</tbody>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-3 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{children}</td>;
          },
          a({ href, children }) {
            const isExternal = href?.startsWith('http') || href?.startsWith('//');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="inline-flex items-baseline gap-1 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
              >
                <span>{children}</span>
                {isExternal && <ArrowUpRight className="h-3.5 w-3.5 inline shrink-0 opacity-75" aria-hidden="true" />}
              </a>
            );
          },
          img({ src, alt }) {
            if (typeof src === 'string' && promotedImageUrls.includes(src)) {
              return null;
            }
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={src}
                alt={alt || 'Case study illustration'}
                loading="lazy"
                className="my-6 max-w-full h-auto rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-md object-contain"
              />
            );
          },
          hr() {
            return <hr className="my-8 border-t border-zinc-200 dark:border-zinc-800" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
