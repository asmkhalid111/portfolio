import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowUpRight,
  Github,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

export const instant = false;

interface ProjectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: "Project Details" };

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("title, summary")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!project) {
    return {
      title: "Project Not Found | Software Engineering Portfolio",
    };
  }

  return {
    title: `${project.title} | Software Engineering Portfolio`,
    description: project.summary,
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const supabase = await createClient();

  // Fetch only required columns, filtering by slug AND status = 'published'
  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "title, slug, summary, problem, approach, outcome, technologies, repository_url, live_demo_url, featured"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  // Handle genuine database errors separately from 404 responses
  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20 space-y-8">
        <nav aria-label="Breadcrumb">
          <Link
            href="/#projects"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Projects</span>
          </Link>
        </nav>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Unable to load project details at this time. Please try again later.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Missing or unpublished projects return 404
  if (!project) {
    notFound();
  }

  const hasNarrative = Boolean(
    (project.problem && project.problem.trim().length > 0) ||
      (project.approach && project.approach.trim().length > 0) ||
      (project.outcome && project.outcome.trim().length > 0)
  );

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20 space-y-12">
      {/* Top Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb">
        <Link
          href="/#projects"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Projects</span>
        </Link>
      </nav>

      {/* Project Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {project.featured && (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-semibold text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              Featured Case Study
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Portfolio Project
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-50">
          {project.title}
        </h1>

        <p className="max-w-3xl text-lg leading-relaxed text-gray-700 sm:text-xl dark:text-gray-300">
          {project.summary}
        </p>

        {/* Action Links */}
        {(project.repository_url || project.live_demo_url) && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {project.repository_url && (
              <a
                href={project.repository_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                <span>Source Code</span>
                <ArrowUpRight className="h-4 w-4 opacity-75" aria-hidden="true" />
              </a>
            )}

            {project.live_demo_url && (
              <a
                href={project.live_demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <ExternalLink
                  className="h-4 w-4 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
                <span>Live Demo</span>
                <ArrowUpRight className="h-4 w-4 opacity-75" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </header>

      {/* Technologies Section */}
      {project.technologies && project.technologies.length > 0 && (
        <section
          aria-labelledby="tech-heading"
          className="space-y-3 border-t border-gray-200 pt-8 dark:border-gray-800"
        >
          <h2
            id="tech-heading"
            className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
          >
            Technologies &amp; Tools
          </h2>
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((tech) => (
              <span
                key={tech}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Narrative Case Study Details: Only render when existing fields contain data */}
      {hasNarrative && (
        <div className="space-y-8 border-t border-gray-200 pt-8 dark:border-gray-800">
          {project.problem && project.problem.trim().length > 0 && (
            <section aria-labelledby="problem-heading" className="space-y-3">
              <h2
                id="problem-heading"
                className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
              >
                Problem &amp; Context
              </h2>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {project.problem}
                </p>
              </div>
            </section>
          )}

          {project.approach && project.approach.trim().length > 0 && (
            <section aria-labelledby="approach-heading" className="space-y-3">
              <h2
                id="approach-heading"
                className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
              >
                Architecture &amp; Approach
              </h2>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {project.approach}
                </p>
              </div>
            </section>
          )}

          {project.outcome && project.outcome.trim().length > 0 && (
            <section aria-labelledby="outcome-heading" className="space-y-3">
              <h2
                id="outcome-heading"
                className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
              >
                Results &amp; Key Outcomes
              </h2>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {project.outcome}
                </p>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Footer Navigation Link */}
      <footer className="border-t border-gray-200 pt-8 dark:border-gray-800">
        <Link
          href="/#projects"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to all projects</span>
        </Link>
      </footer>
    </article>
  );
}
