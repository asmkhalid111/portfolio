import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Code2, CheckCircle2, Layers } from 'lucide-react';
import { CaseStudyHeader } from '@/components/case-study/CaseStudyHeader';
import { StickyChapterNav, type Chapter } from '@/components/case-study/StickyChapterNav';
import { MediaGalleryBlock, type MediaItem } from '@/components/case-study/MediaGalleryBlock';
import { MarkdownContent } from '@/components/case-study/MarkdownContent';
import { CaseStudyCoordinator } from '@/components/case-study/CaseStudyCoordinator';
import { DocumentationDrawer } from '@/components/case-study/DocumentationDrawer';
import { SystemArchitectureExhibit } from '@/components/case-study/SystemArchitectureExhibit';
import type { ArchitectureExhibit } from '@/lib/case-studies/architecture-exhibits';
import type { GitHubDocumentResult, GitHubChapter } from '@/lib/github/sync';

export interface CaseStudyArticleProject {
  title: string;
  summary?: string | null;
  problem?: string | null;
  approach?: string | null;
  outcome?: string | null;
  technologies?: string[] | null;
  repository_url?: string | null;
  live_demo_url?: string | null;
  featured?: boolean | null;
  status?: string;
}

export interface CaseStudyArticleProps {
  project: CaseStudyArticleProject;
  galleryItems: MediaItem[];
  allChapters: Chapter[];
  githubResult: GitHubDocumentResult;
  architectureExhibit?: ArchitectureExhibit | null;
  hasNarrative?: boolean;
  banner?: React.ReactNode;
  backHref?: string;
}

export function CaseStudyArticle({
  project,
  galleryItems,
  allChapters,
  githubResult,
  architectureExhibit,
  hasNarrative: explicitHasNarrative,
  banner,
  backHref = '/#projects',
}: CaseStudyArticleProps) {
  const hasNarrative =
    explicitHasNarrative ??
    Boolean(
      (project.problem && project.problem.trim().length > 0) ||
        (project.approach && project.approach.trim().length > 0) ||
        (project.outcome && project.outcome.trim().length > 0)
    );

  return (
    <article className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/80 text-zinc-900 dark:text-zinc-100">
      {/* Optional Banner Slot (Dev preview / Admin draft notices) */}
      {banner}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* Header Section */}
        <CaseStudyHeader
          title={project.title}
          summary={project.summary || ''}
          featured={Boolean(project.featured)}
          repositoryUrl={project.repository_url}
          liveDemoUrl={project.live_demo_url}
          technologies={project.technologies || []}
          hasMedia={galleryItems.length > 0}
        />

        {/* Media Gallery Artifacts (Rendered when authentic visual artifacts exist) */}
        {galleryItems.length > 0 && (
          <div className="pt-2">
            <MediaGalleryBlock media={galleryItems} title={`${project.title} Artifacts`} />
          </div>
        )}

        {/* Main Content Layout (Sticky Nav + Prose coordinated via client provider) */}
        <CaseStudyCoordinator
          documentationChapterIds={githubResult.chapters.map((ch: GitHubChapter) => ch.id)}
        >
          <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-12 items-start pt-4 min-w-0">
            {/* Sticky Chapter Navigation (Desktop sidebar & Mobile bar) */}
            <StickyChapterNav chapters={allChapters} />

            {/* Primary Case Study Content Body */}
            <div className="space-y-12 min-w-0">
              {/* Database Narrative: Problem / Approach / Outcome */}
              {hasNarrative && (
                <section id="architectural-overview" className="scroll-mt-28 space-y-6">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                    <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Architectural Context &amp; Objectives</span>
                  </div>

                  <div className="space-y-6">
                    {/* 1. Prominent Problem Statement */}
                    {project.problem && (
                      <div className="border-l-2 border-zinc-900 dark:border-zinc-100 pl-4 sm:pl-6 py-1">
                        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 font-semibold">
                          The Challenge
                        </h3>
                        <p className="text-lg sm:text-xl font-medium leading-relaxed text-zinc-900 dark:text-zinc-100 whitespace-pre-line">
                          {project.problem}
                        </p>
                      </div>
                    )}

                    {/* 2. Quieter Methodology / Engineering Approach */}
                    {project.approach && (
                      <div className="pl-4 sm:pl-6 space-y-1.5">
                        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold">
                          Engineering Approach
                        </h3>
                        <p className="text-base sm:text-lg leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-line font-normal">
                          {project.approach}
                        </p>
                      </div>
                    )}

                    {/* 3. Clearly Distinguishable Outcome & Verification */}
                    {project.outcome && (
                      <div className="rounded-xl border border-zinc-200/80 bg-zinc-100/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
                        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-zinc-800 dark:text-zinc-200" aria-hidden="true" />
                          <span>Verified Outcome &amp; Deliverables</span>
                        </h3>
                        <p className="text-sm sm:text-base leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                          {project.outcome}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Source-Backed Engineering Exhibit (when defined for project) */}
              {architectureExhibit && (
                <SystemArchitectureExhibit exhibit={architectureExhibit} />
              )}

              {/* Collapsible GitHub Technical Documentation Section */}
              {githubResult.success && githubResult.rawMarkdown ? (
                <DocumentationDrawer
                  sourceUrl={githubResult.sourceUrl}
                  defaultBranch={githubResult.defaultBranch}
                  chapterCount={githubResult.chapters.length}
                >
                  <MarkdownContent
                    content={githubResult.rawMarkdown}
                    promotedImageUrls={galleryItems.map((item) => item.src)}
                  />
                </DocumentationDrawer>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-6 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                  <p>Repository documentation source: {githubResult.error || 'No remote README provided.'}</p>
                </div>
              )}

              {/* Technologies Grid */}
              {project.technologies && project.technologies.length > 0 && (
                <section className="space-y-4 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Full Technology Inventory</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-mono font-medium text-zinc-800 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                        <span>{tech}</span>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Contextual Return Navigation Block */}
              <div className="pt-12 border-t border-zinc-200 dark:border-zinc-800">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                      Ready to explore other projects?
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      Return to the portfolio gallery to review software engineering projects, developer tools, and architecture case studies.
                    </p>
                  </div>
                  <Link
                    href={backHref}
                    id="back-to-projects-bottom"
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Back to Projects</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </CaseStudyCoordinator>
      </div>
    </article>
  );
}
