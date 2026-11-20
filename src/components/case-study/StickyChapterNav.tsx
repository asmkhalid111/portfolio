'use client';

import React, { useEffect, useState } from 'react';
import { ListFilter, BookOpen } from 'lucide-react';
import { useOptionalCaseStudyCoordinator } from './CaseStudyCoordinator';

export interface Chapter {
  id: string;
  title: string;
  level: number;
}

export interface StickyChapterNavProps {
  chapters: Chapter[];
}

export function StickyChapterNav({ chapters }: StickyChapterNavProps) {
  const coordinator = useOptionalCaseStudyCoordinator();
  const [localActiveId, setLocalActiveId] = useState<string>(chapters[0]?.id || '');

  const activeId = coordinator ? coordinator.activeChapterId : localActiveId;
  const setActiveId = coordinator ? coordinator.setActiveChapterId : setLocalActiveId;
  const isExpanded = coordinator?.isDocumentationExpanded;

  useEffect(() => {
    if (!chapters || chapters.length === 0) return;
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find visible entries
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Sort by top offset to find the topmost visible heading
          const sorted = visibleEntries.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          setActiveId(sorted[0].target.id);
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: [0, 1.0],
      }
    );

    chapters.forEach((chapter) => {
      const element = document.getElementById(chapter.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [chapters, isExpanded, setActiveId]);

  if (!chapters || chapters.length === 0) {
    return null;
  }

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (coordinator) {
      coordinator.expandAndNavigate(id);
    } else {
      const element = document.getElementById(id);
      if (element) {
        const yOffset = -90; // account for fixed header
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
        setLocalActiveId(id);
        // Update hash without jumping
        window.history.pushState(null, '', `#${id}`);
      }
    }
  };

  // Find index of first documentation chapter if present
  const firstDocIndex = coordinator
    ? chapters.findIndex((c) => coordinator.isDocChapter(c.id))
    : -1;

  return (
    <>
      {/* Mobile / Tablet Horizontal Chapter Bar */}
      <nav
        aria-label="Mobile Chapter Navigation"
        className="lg:hidden sticky top-14 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 backdrop-blur-md bg-white/95 dark:bg-zinc-950/95 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto scrollbar-none min-w-0 max-w-full"
      >
        <span className="shrink-0 text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1 pr-1">
          <ListFilter className="h-3 w-3" aria-hidden="true" />
          <span>Index</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {chapters.map((chapter) => {
            const isActive = activeId === chapter.id;
            return (
              <a
                key={chapter.id}
                href={`#${chapter.id}`}
                onClick={(e) => handleScrollTo(e, chapter.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-medium ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                {chapter.title}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sticky Vertical Chapter Sidebar */}
      <aside
        aria-label="Table of Contents"
        className="hidden lg:block sticky top-28 self-start w-64 shrink-0 rounded-2xl border border-zinc-200 bg-white/60 p-5 backdrop-blur-xs dark:border-zinc-800 dark:bg-zinc-950/40"
      >
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Case Study Chapters</span>
        </div>

        <ul className="space-y-1 text-sm">
          {chapters.map((chapter, index) => {
            const isActive = activeId === chapter.id;
            const isDoc = coordinator ? coordinator.isDocChapter(chapter.id) : false;
            const showDocHeader = index === firstDocIndex && firstDocIndex > 0;

            return (
              <React.Fragment key={chapter.id}>
                {showDocHeader && (
                  <li className="pt-3 pb-1 border-t border-zinc-150 dark:border-zinc-800/80 my-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2.5">
                      <BookOpen className="h-3 w-3" aria-hidden="true" />
                      <span>Documentation</span>
                    </span>
                  </li>
                )}
                <li className={chapter.level === 3 ? 'pl-3' : ''}>
                  <a
                    href={`#${chapter.id}`}
                    onClick={(e) => handleScrollTo(e, chapter.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`block py-1.5 px-2.5 rounded-lg text-xs leading-relaxed transition-colors ${
                      isActive
                        ? 'bg-zinc-100 font-semibold text-zinc-950 dark:bg-zinc-800/80 dark:text-zinc-50'
                        : isDoc
                          ? 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
                          : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {chapter.title}
                  </a>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
