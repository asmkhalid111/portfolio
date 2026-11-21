'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { updateProjectAction, type ProjectActionState } from '@/lib/projects/actions';
import { ArrowLeft, AlertCircle, Save, Loader2, ExternalLink } from 'lucide-react';
import type { Database } from '@/lib/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];

export function EditProjectForm({ project }: { project: Project }) {
  const updateActionWithId = updateProjectAction.bind(null, project.id);
  const [state, formAction, isPending] = useActionState(updateActionWithId, {
    error: null,
  });

  const [slugValue, setSlugValue] = useState(state.fields?.slug ?? project.slug);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/projects"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Back to Projects"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Edit Project
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Update project details and publication status.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1">
          <a
            href={`/case-study-preview/${project.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
          >
            <ExternalLink className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <span>Preview Case Study</span>
          </a>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            Uses saved slug. Save changes before previewing.
          </span>
        </div>
      </div>

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Project Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            minLength={2}
            maxLength={200}
            defaultValue={state.fields?.title ?? project.title}
            placeholder="e.g. Distributed Task Orchestrator"
            className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            URL Slug <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="slug"
            name="slug"
            required
            maxLength={100}
            value={slugValue}
            onChange={(e) => setSlugValue(e.target.value.toLowerCase())}
            placeholder="e.g. distributed-task-orchestrator"
            className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 font-mono text-xs"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Lowercase alphanumeric and hyphens only. Used for routing: /projects/[slug].
          </p>
        </div>

        {/* Summary */}
        <div>
          <label htmlFor="summary" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Summary <span className="text-red-500">*</span>
          </label>
          <textarea
            id="summary"
            name="summary"
            required
            minLength={10}
            maxLength={600}
            rows={3}
            defaultValue={state.fields?.summary ?? project.summary}
            placeholder="A brief overview of the project, its core purpose, and technical achievements (10–600 characters)."
            className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Technologies */}
        <div>
          <label htmlFor="technologies" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Technologies (comma-separated)
          </label>
          <input
            type="text"
            id="technologies"
            name="technologies"
            defaultValue={
              state.fields?.technologies ??
              (Array.isArray(project.technologies) ? project.technologies.join(', ') : '')
            }
            placeholder="e.g. Next.js, TypeScript, PostgreSQL, Tailwind CSS"
            className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {/* URLs (Repo & Live Demo) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="repository_url" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Repository URL
            </label>
            <input
              type="url"
              id="repository_url"
              name="repository_url"
              defaultValue={state.fields?.repository_url ?? (project.repository_url || '')}
              placeholder="https://github.com/..."
              className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label htmlFor="live_demo_url" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Live Demo URL
            </label>
            <input
              type="url"
              id="live_demo_url"
              name="live_demo_url"
              defaultValue={state.fields?.live_demo_url ?? (project.live_demo_url || '')}
              placeholder="https://..."
              className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Status & Sort Order */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Publication Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={state.fields?.status ?? project.status}
              className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="draft">Draft (Hidden from public)</option>
              <option value="published">Published (Visible on portfolio)</option>
            </select>
          </div>

          <div>
            <label htmlFor="sort_order" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Sort Order
            </label>
            <input
              type="number"
              id="sort_order"
              name="sort_order"
              min="0"
              defaultValue={state.fields?.sort_order ?? project.sort_order}
              className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Featured checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="featured"
            name="featured"
            defaultChecked={state.fields?.featured ?? project.featured}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
          />
          <label htmlFor="featured" className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Feature this project at the top of the portfolio
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link
            href="/admin/projects"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
