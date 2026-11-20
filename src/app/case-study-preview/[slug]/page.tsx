import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Code2, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getGitHubCaseStudy } from '@/lib/github/sync';
import { CaseStudyHeader } from '@/components/case-study/CaseStudyHeader';
import { StickyChapterNav, type Chapter } from '@/components/case-study/StickyChapterNav';
import { MediaGalleryBlock, type MediaItem } from '@/components/case-study/MediaGalleryBlock';
import { MarkdownContent } from '@/components/case-study/MarkdownContent';
import { CaseStudyCoordinator } from '@/components/case-study/CaseStudyCoordinator';
import { DocumentationDrawer } from '@/components/case-study/DocumentationDrawer';
import { getArchitectureExhibit } from '@/lib/case-studies/architecture-exhibits';
import { SystemArchitectureExhibit } from '@/components/case-study/SystemArchitectureExhibit';

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
  // Invariant 1: Access gate
  // Allowed in:
  //   A. Local development (NODE_ENV !== 'production')
  //   B. Vercel Preview deployments ONLY when VERCEL_ENV === 'preview'
  //      AND CASE_STUDY_PREVIEW_ENABLED === 'true' (exact string match)
  // Blocked in:
  //   - Vercel Production (VERCEL_ENV === 'production')
  //   - Preview without the explicit flag
  //   - Preview with flag set to anything other than 'true'
  const isLocalDev = process.env.NODE_ENV !== 'production';
  const isVercelPreviewEnabled =
    process.env.VERCEL_ENV === 'preview' &&
    process.env.CASE_STUDY_PREVIEW_ENABLED === 'true';

  if (!isLocalDev && !isVercelPreviewEnabled) {
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

  // Priority 2.5: Optional Source-Backed Architecture Exhibit
  const architectureExhibit = getArchitectureExhibit(slug);
  if (architectureExhibit) {
    allChapters.push({
      id: 'system-architecture',
      title: 'System Architecture',
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

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* Header Section */}
        <CaseStudyHeader
          title={project.title}
          summary={project.summary}
          featured={project.featured}
          repositoryUrl={project.repository_url}
          liveDemoUrl={project.live_demo_url}
          technologies={project.technologies}
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
          documentationChapterIds={githubResult.chapters.map((ch) => ch.id)}
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
        </CaseStudyCoordinator>
      </div>
    </article>
  );
}
