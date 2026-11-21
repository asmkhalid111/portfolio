'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

export interface CaseStudyCoordinatorContextType {
  isDocumentationExpanded: boolean;
  setIsDocumentationExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  activeChapterId: string;
  setActiveChapterId: React.Dispatch<React.SetStateAction<string>>;
  expandAndNavigate: (targetId: string) => void;
  isDocChapter: (targetId: string) => boolean;
}

const CaseStudyCoordinatorContext =
  createContext<CaseStudyCoordinatorContextType | null>(null);

export function useCaseStudyCoordinator(): CaseStudyCoordinatorContextType {
  const context = useContext(CaseStudyCoordinatorContext);
  if (!context) {
    throw new Error(
      'useCaseStudyCoordinator must be used within a CaseStudyCoordinator'
    );
  }
  return context;
}

export function useOptionalCaseStudyCoordinator(): CaseStudyCoordinatorContextType | null {
  return useContext(CaseStudyCoordinatorContext);
}

export interface CaseStudyCoordinatorProps {
  children: React.ReactNode;
  documentationChapterIds: string[];
}

const NARRATIVE_ANCHOR_IDS = [
  'gallery-heading',
  'architectural-overview',
  'system-architecture',
  'back-to-projects-bottom',
  'repository-documentation',
  'technical-documentation-heading',
];

export function CaseStudyCoordinator({
  children,
  documentationChapterIds,
}: CaseStudyCoordinatorProps) {
  const [isDocumentationExpanded, setIsDocumentationExpanded] =
    useState<boolean>(false);
  const [activeChapterId, setActiveChapterId] = useState<string>('');
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);

  const docIdsRef = useRef<Set<string>>(new Set(documentationChapterIds));
  useEffect(() => {
    docIdsRef.current = new Set(documentationChapterIds);
  }, [documentationChapterIds]);

  const isDocChapter = useCallback((targetId: string): boolean => {
    if (!targetId) return false;
    if (docIdsRef.current.has(targetId)) return true;
    return !NARRATIVE_ANCHOR_IDS.includes(targetId);
  }, []);

  const performScroll = useCallback((targetId: string): boolean => {
    const el = document.getElementById(targetId);
    if (!el) return false;

    // Verify element layout and visibility (handles real browser layout and JSDOM environments)
    if (el.closest('[hidden]')) return false;
    if (typeof window !== 'undefined') {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }

    const yOffset = -90; // Fixed header clearance offset
    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActiveChapterId(targetId);

    // Update URL hash without forcing hard page jump
    if (window.location.hash !== `#${targetId}`) {
      window.history.pushState(null, '', `#${targetId}`);
    }

    // Accessible keyboard focus management without visible layout shift
    if (!el.hasAttribute('tabIndex')) {
      el.setAttribute('tabIndex', '-1');
    }
    el.focus({ preventScroll: true });

    return true;
  }, []);

  const expandAndNavigate = useCallback(
    (targetId: string) => {
      if (isDocChapter(targetId)) {
        if (!isDocumentationExpanded) {
          setIsDocumentationExpanded(true);
          setPendingScrollId(targetId);
        } else {
          const scrolled = performScroll(targetId);
          if (!scrolled) {
            setPendingScrollId(targetId);
          }
        }
      } else {
        performScroll(targetId);
      }
    },
    [isDocChapter, isDocumentationExpanded, performScroll]
  );

  // Layout synchronization polling effect for React commit and DOM mount
  useEffect(() => {
    if (!pendingScrollId) return;
    if (!isDocumentationExpanded) return;

    let rafId: number;
    let attempts = 0;
    const maxAttempts = 50; // ~800ms at 60fps

    const checkAndScroll = () => {
      const scrolled = performScroll(pendingScrollId);
      if (scrolled) {
        setPendingScrollId(null);
      } else if (attempts < maxAttempts) {
        attempts++;
        rafId = requestAnimationFrame(checkAndScroll);
      } else {
        // Polling timeout reached
        setPendingScrollId(null);
      }
    };

    rafId = requestAnimationFrame(checkAndScroll);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isDocumentationExpanded, pendingScrollId, performScroll]);

  // Deep-link and history (hashchange / popstate) handler
  useEffect(() => {
    const handleUrlHash = () => {
      const rawHash = window.location.hash.replace(/^#/, '');
      if (!rawHash) return;

      let hash = rawHash;
      try {
        hash = decodeURIComponent(rawHash);
      } catch {
        // Malformed percent-encoded fragment; ignore safely
        return;
      }

      if (isDocChapter(hash)) {
        setIsDocumentationExpanded(true);
        setPendingScrollId(hash);
      } else {
        performScroll(hash);
      }
    };

    // Run on initial mount
    handleUrlHash();

    window.addEventListener('hashchange', handleUrlHash);
    window.addEventListener('popstate', handleUrlHash);

    return () => {
      window.removeEventListener('hashchange', handleUrlHash);
      window.removeEventListener('popstate', handleUrlHash);
    };
  }, [isDocChapter, performScroll]);

  return (
    <CaseStudyCoordinatorContext.Provider
      value={{
        isDocumentationExpanded,
        setIsDocumentationExpanded,
        activeChapterId,
        setActiveChapterId,
        expandAndNavigate,
        isDocChapter,
      }}
    >
      {children}
    </CaseStudyCoordinatorContext.Provider>
  );
}
