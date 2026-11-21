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
  hasMedia?: boolean;
}

function cleanRepoUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?github\.com\//, 'github.com/');
}

export function CaseStudyHeader({
  title,
  summary,
  featured = false,
  repositoryUrl,
  liveDemoUrl,
  technologies = [],
  hasMedia = false,
}: CaseStudyHeaderProps) {
  return (
    <header className="space-y-6 pb-8 border-b border-zinc-200 dark:border-zinc-800">
      {/* Breadcrumb & Badges */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/#projects"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
          id="back-to-projects-top"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Projects</span>
        </Link>

        {featured && (
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
            Featured Work
          </span>
        )}
      </div>

      {/* Conditional Layout: Media-Absent vs Media-Present */}
      {!hasMedia ? (
        /* Layout B: Project WITHOUT Genuine Media (e.g. BornoMala, BanglaScript) */
        /* 2-Column Editorial Grid: Left Lead Narrative, Right Factual Spec Rail */
        <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start pt-2">
          <div className="lg:col-span-7 space-y-4">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.1]">
              {title}
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
              {summary}
            </p>

            {/* Actions */}
            {(repositoryUrl || liveDemoUrl) && (
              <div className="flex flex-wrap items-center gap-3 pt-3">
                {repositoryUrl && (
                  <a
                    href={repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    id="action-view-repository"
                  >
                    <Github className="h-4 w-4" aria-hidden="true" />
                    <span>GitHub Repository</span>
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  </a>
                )}
                {liveDemoUrl && (
                  <a
                    href={liveDemoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    id="action-view-demo"
                  >
                    <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    <span>Live Demonstration</span>
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Factual Information Rail */}
          <div className="lg:col-span-5 lg:border-l lg:border-zinc-200/80 lg:dark:border-zinc-800/80 lg:pl-8 space-y-6 pt-6 lg:pt-0">
            {technologies && technologies.length > 0 && (
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                  Technologies
                </div>
                <div className="flex flex-wrap gap-1.5" aria-label="Project technologies">
                  {technologies.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-100/60 px-2 py-0.5 text-xs font-mono font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {repositoryUrl && (
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
                  Repository
                </div>
                <a
                  href={repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4"
                >
                  <span>{cleanRepoUrl(repositoryUrl)}</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Layout A: Project WITH Genuine Media (e.g. Web-LAN-Chat) */
        /* Clear headline & summary with inline actions, leading directly to the prominent gallery */
        <div className="space-y-4 pt-2">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.1]">
            {title}
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal max-w-3xl">
            {summary}
          </p>

          {/* Combined Tech Tags & Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            {technologies && technologies.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5" aria-label="Project technologies">
                {technologies.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-100/60 px-2 py-0.5 text-xs font-mono font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {(repositoryUrl || liveDemoUrl) && (
              <div className="flex flex-wrap items-center gap-3">
                {repositoryUrl && (
                  <a
                    href={repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    id="action-view-repository"
                  >
                    <Github className="h-4 w-4" aria-hidden="true" />
                    <span>GitHub Repository</span>
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  </a>
                )}
                {liveDemoUrl && (
                  <a
                    href={liveDemoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    id="action-view-demo"
                  >
                    <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    <span>Live Demonstration</span>
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
