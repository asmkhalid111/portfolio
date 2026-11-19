import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ExternalLink, Code2, CheckCircle2, AlertTriangle, Layers, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getGitHubCaseStudy } from '@/lib/github/sync';
import { CaseStudyHeader } from '@/components/case-study/CaseStudyHeader';
import { StickyChapterNav, type Chapter } from '@/components/case-study/StickyChapterNav';
import { MediaGalleryBlock, type MediaItem } from '@/components/case-study/MediaGalleryBlock';
import { MarkdownContent } from '@/components/case-study/MarkdownContent';

export const instant = false;

interface CaseStudyPreviewPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: CaseStudyPreviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: 'Case Study Preview' };

  return {
    title: `[Dev Preview] ${slug} | Case Study`,
    description: `Development-only technical case study preview for ${slug}.`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function CaseStudyPreviewPage({
  params,
}: CaseStudyPreviewPageProps) {
  // Invariant 1: Development-only preview enforcement
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const { slug } = await params;
  if (!slug) {
    notFound();
  }

  const supabase = await createClient();

  // Invariant 2: Dynamic slug resolution from Supabase (only published projects)
  const { data: project, error: dbError } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (dbError || !project) {
    notFound();
  }

  // Invariant 3: GitHub README Fetch with fallback
  const githubResult = await getGitHubCaseStudy(project.repository_url);

  // Invariant 4: Resolve Media Items
  // Priority 1: Supabase project_media rows (with storage path resolution)
  const { data: mediaRows } = await supabase
    .from('project_media')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order', { ascending: true });

  const galleryItems: MediaItem[] = [];

  if (mediaRows && mediaRows.length > 0) {
    mediaRows.forEach((row) => {
      let resolvedSrc = row.storage_path;
      if (!resolvedSrc.startsWith('http://') && !resolvedSrc.startsWith('https://')) {
        const { data } = supabase.storage.from('project-media').getPublicUrl(row.storage_path);
        if (data?.publicUrl) {
          resolvedSrc = data.publicUrl;
        }
      }
      galleryItems.push({
        id: row.id,
        src: resolvedSrc,
        alt: row.alt_text || project.title,
        caption: row.caption,
        badge: 'Project Media',
      });
    });
  } else if (githubResult.extractedImages && githubResult.extractedImages.length > 0) {
    // Priority 2: Genuine non-badge project screenshots extracted dynamically from README
    githubResult.extractedImages.slice(0, 4).forEach((img, idx) => {
      galleryItems.push({
        id: `readme-artifact-${idx}`,
        src: img.src,
        alt: img.alt || `${project.title} Artifact ${idx + 1}`,
        caption: img.alt && img.alt.length > 3 ? img.alt : `Repository Screenshot Artifact 0${idx + 1}`,
        badge: 'Repository Artifact',
      });
    });
  }
  // Priority 3: When galleryItems is empty, it remains [] and the gallery block is omitted entirely.

  // Combine chapters from narrative and GitHub docs
  const allChapters: Chapter[] = [];

  const hasNarrative = Boolean(
    (project.problem && project.problem.trim().length > 0) ||
      (project.approach && project.approach.trim().length > 0) ||
      (project.outcome && project.outcome.trim().length > 0)
  );

  if (galleryItems.length > 0) {
    allChapters.push({
      id: 'gallery-heading',
      title: 'Visual Artifacts',
      level: 2,
    });
  }

  if (hasNarrative) {
    allChapters.push({
      id: 'architectural-overview',
      title: 'Architectural Overview',
      level: 2,
    });
  }

  if (githubResult.success && githubResult.chapters.length > 0) {
    githubResult.chapters.forEach((ch) => {
      // Avoid duplicate IDs
      if (!allChapters.some((existing) => existing.id === ch.id)) {
        allChapters.push(ch);
      }
    });
  }

  return (
    <article className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/80 text-zinc-900 dark:text-zinc-100">
      {/* Dev Preview Sticky Notice */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs font-mono text-amber-900 dark:text-amber-200 text-center flex items-center justify-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden="true" />
        <span>
          <strong>DEVELOPMENT PREVIEW ONLY</strong> — Testing reusable case study architecture on live Supabase slug: <code className="font-semibold underline">{slug}</code>
        </span>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* Header Section */}
        <CaseStudyHeader
          title={project.title}
          summary={project.summary}
          featured={project.featured}
          repositoryUrl={project.repository_url}
          liveDemoUrl={project.live_demo_url}
          technologies={project.technologies}
        />

        {/* Media Gallery Artifacts (Only rendered when authentic visual artifacts exist) */}
        {galleryItems.length > 0 && (
          <MediaGalleryBlock media={galleryItems} title={`${project.title} Artifacts`} />
        )}

        {/* Main Content Layout (Sticky Nav + Prose) */}
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-12 items-start pt-6">
          {/* Sticky Chapter Navigation (Desktop sidebar & Mobile bar) */}
          <StickyChapterNav chapters={allChapters} />

          {/* Primary Case Study Content Body */}
          <div className="space-y-12 min-w-0">
            {/* Database Narrative: Problem / Approach / Outcome */}
            {hasNarrative && (
              <section id="architectural-overview" className="scroll-mt-28 space-y-8">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Verified Project Narrative</span>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {project.problem && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                      <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                        01. Problem &amp; Context
                      </h3>
                      <p className="text-base sm:text-lg leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                        {project.problem}
                      </p>
                    </div>
                  )}

                  {project.approach && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                      <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                        02. Architecture &amp; Methodology
                      </h3>
                      <p className="text-base sm:text-lg leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                        {project.approach}
                      </p>
                    </div>
                  )}

                  {project.outcome && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                      <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                        03. Key Outcomes &amp; Verification
                      </h3>
                      <p className="text-base sm:text-lg leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                        {project.outcome}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* GitHub Documentation Section */}
            {githubResult.success && githubResult.rawMarkdown ? (
              <section className="space-y-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Synchronized GitHub Technical Documentation</span>
                  </span>
                  <a
                    href={githubResult.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>View raw source</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                  <MarkdownContent
                    content={githubResult.rawMarkdown}
                    promotedImageUrls={galleryItems.map((item) => item.src)}
                  />
                </div>
              </section>
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
                  href="/#projects"
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
      </div>
    </article>
  );
}
