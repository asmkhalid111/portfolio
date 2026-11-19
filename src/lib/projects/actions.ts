'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminAuthStatus } from '@/lib/auth/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ProjectActionState = {
  error?: string | null;
  fields?: {
    title?: string;
    slug?: string;
    summary?: string;
    technologies?: string;
    repository_url?: string;
    live_demo_url?: string;
    status?: string;
    featured?: boolean;
    sort_order?: number;
  };
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_REGEX = /^https?:\/\/.+/i;

export async function createProjectAction(
  prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  // 1. Authorize: Administrator authorization verified on every submission
  const authStatus = await getAdminAuthStatus();
  if (authStatus.error || !authStatus.isAdmin || !authStatus.user) {
    return {
      error: 'Unauthorized: Administrator access required to create projects.',
    };
  }

  // 2. Extract and sanitize inputs
  const title = (formData.get('title') as string || '').trim();
  const slug = (formData.get('slug') as string || '').trim().toLowerCase();
  const summary = (formData.get('summary') as string || '').trim();
  const technologiesRaw = (formData.get('technologies') as string || '').trim();
  const repositoryUrl = (formData.get('repository_url') as string || '').trim() || null;
  const liveDemoUrl = (formData.get('live_demo_url') as string || '').trim() || null;
  const status = (formData.get('status') as string || 'draft').trim();
  const featured = formData.get('featured') === 'true' || formData.get('featured') === 'on';
  const sortOrderRaw = formData.get('sort_order') as string;
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw, 10) : 0;

  const capturedFields = {
    title,
    slug,
    summary,
    technologies: technologiesRaw,
    repository_url: repositoryUrl || '',
    live_demo_url: liveDemoUrl || '',
    status,
    featured,
    sort_order: isNaN(sortOrder) ? 0 : sortOrder,
  };

  // 3. Schema-adherent server validation
  if (title.length < 2 || title.length > 200) {
    return {
      error: 'Project title must be between 2 and 200 characters in length.',
      fields: capturedFields,
    };
  }

  if (!slug || slug.length > 100 || !SLUG_REGEX.test(slug)) {
    return {
      error:
        'Slug must be lowercase alphanumeric characters and hyphens only (e.g. "my-project"), up to 100 characters.',
      fields: capturedFields,
    };
  }

  if (summary.length < 10 || summary.length > 600) {
    return {
      error: 'Summary must be between 10 and 600 characters in length.',
      fields: capturedFields,
    };
  }

  if (repositoryUrl && !URL_REGEX.test(repositoryUrl)) {
    return {
      error: 'Repository URL must be a valid HTTP or HTTPS address.',
      fields: capturedFields,
    };
  }

  if (liveDemoUrl && !URL_REGEX.test(liveDemoUrl)) {
    return {
      error: 'Live demo URL must be a valid HTTP or HTTPS address.',
      fields: capturedFields,
    };
  }

  if (status !== 'draft' && status !== 'published') {
    return {
      error: 'Status must be either "draft" or "published".',
      fields: capturedFields,
    };
  }

  if (isNaN(sortOrder) || sortOrder < 0) {
    return {
      error: 'Sort order must be a non-negative integer (0 or greater).',
      fields: capturedFields,
    };
  }

  // Parse technologies array
  const technologies = technologiesRaw
    ? technologiesRaw
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  // 4. Persistence via authenticated Supabase server client
  const supabase = await createClient();

  const { error: insertError } = await supabase.from('projects').insert({
    title,
    slug,
    summary,
    technologies,
    repository_url: repositoryUrl,
    live_demo_url: liveDemoUrl,
    status,
    featured,
    sort_order: sortOrder,
    created_by: authStatus.user.id, // Derived strictly from server session, never user input
  });

  if (insertError) {
    // Duplicate slug check (Postgres code 23505: unique_violation)
    if (insertError.code === '23505' || insertError.message.includes('slug')) {
      return {
        error: `A project with the slug "${slug}" already exists. Please choose a unique slug.`,
        fields: capturedFields,
      };
    }

    return {
      error: `Failed to create project: ${insertError.message}`,
      fields: capturedFields,
    };
  }

  // 5. Revalidate listing and redirect outside any try/catch
  revalidatePath('/admin/projects');
  redirect('/admin/projects');
}

export async function updateProjectAction(
  id: string,
  prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  if (!id || typeof id !== 'string') {
    return { error: 'Invalid or missing project identifier.' };
  }

  // 1. Authorize: Administrator authorization verified on every submission
  const authStatus = await getAdminAuthStatus();
  if (authStatus.error || !authStatus.isAdmin || !authStatus.user) {
    return {
      error: 'Unauthorized: Administrator access required to update projects.',
    };
  }

  // 2. Extract and sanitize inputs
  const title = (formData.get('title') as string || '').trim();
  const slug = (formData.get('slug') as string || '').trim().toLowerCase();
  const summary = (formData.get('summary') as string || '').trim();
  const technologiesRaw = (formData.get('technologies') as string || '').trim();
  const repositoryUrl = (formData.get('repository_url') as string || '').trim() || null;
  const liveDemoUrl = (formData.get('live_demo_url') as string || '').trim() || null;
  const status = (formData.get('status') as string || 'draft').trim();
  const featured = formData.get('featured') === 'true' || formData.get('featured') === 'on';
  const sortOrderRaw = formData.get('sort_order') as string;
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw, 10) : 0;

  const capturedFields = {
    title,
    slug,
    summary,
    technologies: technologiesRaw,
    repository_url: repositoryUrl || '',
    live_demo_url: liveDemoUrl || '',
    status,
    featured,
    sort_order: isNaN(sortOrder) ? 0 : sortOrder,
  };

  // 3. Schema-adherent server validation
  if (title.length < 2 || title.length > 200) {
    return {
      error: 'Project title must be between 2 and 200 characters in length.',
      fields: capturedFields,
    };
  }

  if (!slug || slug.length > 100 || !SLUG_REGEX.test(slug)) {
    return {
      error:
        'Slug must be lowercase alphanumeric characters and hyphens only (e.g. "my-project"), up to 100 characters.',
      fields: capturedFields,
    };
  }

  if (summary.length < 10 || summary.length > 600) {
    return {
      error: 'Summary must be between 10 and 600 characters in length.',
      fields: capturedFields,
    };
  }

  if (repositoryUrl && !URL_REGEX.test(repositoryUrl)) {
    return {
      error: 'Repository URL must be a valid HTTP or HTTPS address.',
      fields: capturedFields,
    };
  }

  if (liveDemoUrl && !URL_REGEX.test(liveDemoUrl)) {
    return {
      error: 'Live demo URL must be a valid HTTP or HTTPS address.',
      fields: capturedFields,
    };
  }

  if (status !== 'draft' && status !== 'published') {
    return {
      error: 'Status must be either "draft" or "published".',
      fields: capturedFields,
    };
  }

  if (isNaN(sortOrder) || sortOrder < 0) {
    return {
      error: 'Sort order must be a non-negative integer (0 or greater).',
      fields: capturedFields,
    };
  }

  // Parse technologies array
  const technologies = technologiesRaw
    ? technologiesRaw
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  // 4. Persistence via authenticated Supabase server client (immutable fields id, created_by, created_at excluded)
  const supabase = await createClient();

  const { data: updated, error: updateError } = await supabase
    .from('projects')
    .update({
      title,
      slug,
      summary,
      technologies,
      repository_url: repositoryUrl,
      live_demo_url: liveDemoUrl,
      status,
      featured,
      sort_order: sortOrder,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (updateError) {
    // Duplicate slug check (Postgres code 23505: unique_violation)
    if (updateError.code === '23505' || updateError.message.includes('slug')) {
      return {
        error: `A project with the slug "${slug}" already exists. Please choose a unique slug.`,
        fields: capturedFields,
      };
    }

    return {
      error: `Failed to update project: ${updateError.message}`,
      fields: capturedFields,
    };
  }

  if (!updated) {
    return {
      error: 'Project not found or no permission to update.',
      fields: capturedFields,
    };
  }

  // 5. Revalidate listing and redirect outside any try/catch
  revalidatePath('/admin/projects');
  redirect('/admin/projects');
}

export async function deleteProjectAction(
  id: string
): Promise<{ error?: string | null; success?: boolean }> {
  if (!id || typeof id !== 'string') {
    return { error: 'Invalid or missing project identifier.' };
  }

  // 1. Authorize: Administrator authorization verified on every deletion
  const authStatus = await getAdminAuthStatus();
  if (authStatus.error || !authStatus.isAdmin || !authStatus.user) {
    return {
      error: 'Unauthorized: Administrator access required to delete projects.',
    };
  }

  // 2. Perform deletion under caller JWT with RLS
  const supabase = await createClient();

  const { data: deleted, error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (deleteError) {
    return {
      error: `Failed to delete project: ${deleteError.message}`,
    };
  }

  // Safeguard: Verify a row was actually deleted; zero affected rows must not count as success
  if (!deleted) {
    return {
      error: 'Project not found or already deleted.',
    };
  }

  // 3. Revalidate project listing
  revalidatePath('/admin/projects');
  return { success: true };
}
