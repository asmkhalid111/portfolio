import { createClient } from '@/lib/supabase/server';
import { connection } from 'next/server';
import Link from 'next/link';
import { FolderKanban, CheckCircle2, Clock, Plus, Pencil } from 'lucide-react';
import { DeleteProjectButton } from './delete-button';

export const instant = false;

export default async function AdminProjectsPage() {
  await connection();
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, slug, summary, status, featured, sort_order, updated_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Projects
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your portfolio projects and publication status.
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          Failed to load projects: {error.message}
        </div>
      </div>
    );
  }

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Projects
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your portfolio projects and publication status.
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New Project</span>
        </Link>
      </div>

      {!hasProjects ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <FolderKanban className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">
            No projects found
          </h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            You haven&apos;t added any projects to your portfolio yet.
          </p>
          <div className="mt-5">
            <Link
              href="/admin/projects/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Create Project</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-850">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Project Title
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Sort Order
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Last Updated
                </th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {projects.map((project) => (
                <tr key={project.id} className="transition hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {project.title}
                    </div>
                    {project.summary && (
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {project.summary}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {project.status === 'published' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {project.sort_order}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Edit</span>
                      </Link>
                      <DeleteProjectButton id={project.id} title={project.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
