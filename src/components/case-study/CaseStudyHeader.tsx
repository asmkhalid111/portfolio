import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Github, ExternalLink } from 'lucide-react';

export interface CaseStudyHeaderProps {
  title: string;
  summary: string;
  featured?: boolean;
  repositoryUrl?: string | null;
  liveDemoUrl?: string | null;
  technologies?: string[];
  slug?: string;
  category?: string;
  role?: string;
  architecture?: string;
  testing?: string;
}

export function CaseStudyHeader({
  title,
  summary,
  featured = false,
  repositoryUrl,
  liveDemoUrl,
  technologies = [],
}: CaseStudyHeaderProps) {
  return (
    <header className="space-y-6 pb-8 border-b border-zinc-200 dark:border-zinc-800">
      {/* Breadcrumb & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/#projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
          id="back-to-projects-top"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Projects</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-mono font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            DEV PREVIEW (READ-ONLY)
          </span>
          {featured && (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              Featured Work
            </span>
          )}
        </div>
      </div>

      {/* Main Heading & Lead */}
      <div className="space-y-4 max-w-4xl">
        <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Technical Case Study
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          {title}
        </h1>
        <p className="text-lg sm:text-xl text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
          {summary}
        </p>
      </div>

      {/* Technology Stack Pills (Rendered only from authentic project data) */}
      {technologies && technologies.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="Project technologies">
          {technologies.map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100/80 px-2.5 py-1 text-xs font-mono font-medium text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* Action Links (Source Code & Live Demo) */}
      {(repositoryUrl || liveDemoUrl) && (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {repositoryUrl && (
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              id="action-view-repository"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              <span>GitHub Repository</span>
              <ArrowUpRight className="h-4 w-4 opacity-75" aria-hidden="true" />
            </a>
          )}

          {liveDemoUrl && (
            <a
              href={liveDemoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              id="action-view-demo"
            >
              <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>Live Demonstration</span>
              <ArrowUpRight className="h-4 w-4 opacity-75" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </header>
  );
}
