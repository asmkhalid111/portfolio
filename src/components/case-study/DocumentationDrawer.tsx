'use client';

import React, { useState } from 'react';
import { BookOpen, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useOptionalCaseStudyCoordinator } from './CaseStudyCoordinator';

export interface DocumentationDrawerProps {
  sourceUrl?: string;
  defaultBranch?: string;
  chapterCount?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

export function DocumentationDrawer({
  sourceUrl,
  defaultBranch,
  chapterCount,
  isExpanded: controlledExpanded,
  onToggle: controlledOnToggle,
  children,
}: DocumentationDrawerProps) {
  const coordinator = useOptionalCaseStudyCoordinator();
  const [localExpanded, setLocalExpanded] = useState<boolean>(false);

  // Resolution: controlled prop > coordinator context > local state
  const isExpanded =
    controlledExpanded !== undefined
      ? controlledExpanded
      : coordinator
        ? coordinator.isDocumentationExpanded
        : localExpanded;

  const handleToggle = () => {
    if (controlledOnToggle) {
      controlledOnToggle();
    } else if (coordinator) {
      coordinator.setIsDocumentationExpanded((prev) => !prev);
    } else {
      setLocalExpanded((prev) => !prev);
    }
  };

  return (
    <section
      id="repository-documentation"
      aria-labelledby="technical-documentation-heading"
      className="space-y-6 pt-6 border-t border-zinc-200 dark:border-zinc-800"
    >
      {/* Top Source Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
          <span className="font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Repository Technical Documentation
          </span>
        </div>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <span>View raw source on GitHub</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>

      {/* Restrained Appendix Masthead */}
      <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3
              id="technical-documentation-heading"
              className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              Technical Documentation &amp; Setup Manual
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              Complete upstream README manual
              {defaultBranch ? ' from ' : ''}
              {defaultBranch && (
                <code className="rounded bg-zinc-200/70 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  {defaultBranch}
                </code>
              )}
              {chapterCount && chapterCount > 0
                ? ` • ${chapterCount} documented ${chapterCount === 1 ? 'section' : 'sections'}`
                : ''}
            </p>
          </div>

          <button
            type="button"
            id="technical-documentation-toggle"
            aria-expanded={isExpanded}
            aria-controls="technical-documentation-panel"
            onClick={handleToggle}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-800 shadow-xs hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-750 dark:focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-900 transition-all shrink-0 cursor-pointer min-h-[44px]"
          >
            <span>{isExpanded ? 'Hide Technical Documentation' : 'Show Technical Documentation'}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Expandable Technical Documentation Region */}
      {isExpanded && (
        <div
          id="technical-documentation-panel"
          role="region"
          aria-labelledby="technical-documentation-heading"
          className="space-y-6"
        >
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
            {children}

            {/* Quiet Bottom Collapse Control for Ergonomics */}
            <div className="pt-8 mt-10 border-t border-zinc-150 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>End of upstream repository documentation</span>
              <button
                type="button"
                onClick={() => {
                  handleToggle();
                  const toggleBtn = document.getElementById('technical-documentation-toggle');
                  if (toggleBtn) {
                    if (typeof toggleBtn.scrollIntoView === 'function') {
                      toggleBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    toggleBtn.focus();
                  }
                }}
                className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer py-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
              >
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Collapse Documentation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
