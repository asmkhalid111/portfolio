import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAdminAuthStatus } from '@/lib/auth/admin';
import { CaseStudyArticle } from '@/components/case-study/CaseStudyArticle';
import { assembleCaseStudyData } from '@/lib/case-studies/assemble-data';

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
  // Explicitly deny Vercel Production regardless of NODE_ENV
  if (process.env.VERCEL_ENV === 'production') {
    notFound();
  }

  // Allowed in:
  //   A. Local development (NODE_ENV !== 'production' and no VERCEL_ENV set)
  //   B. Vercel Preview deployments ONLY when VERCEL_ENV === 'preview'
  //      AND CASE_STUDY_PREVIEW_ENABLED === 'true' (exact string match)
  // Blocked in:
  //   - Vercel Production (VERCEL_ENV === 'production')
  //   - Preview without the explicit flag
  //   - Preview with flag set to anything other than 'true'
  const isLocalDev = process.env.NODE_ENV !== 'production' && !process.env.VERCEL_ENV;
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

  // Invariant 2: Evaluate caller administrator authorization
  // Server-side session verification via live GoTrue and public.is_admin() RPC.
  // Fails closed on any authentication or database error.
  const adminStatus = await getAdminAuthStatus();
  const isVerifiedAdmin = adminStatus.isAdmin === true;

  const supabase = await createClient();

  // Invariant 3: Dynamic slug resolution from Supabase
  // Verified administrators can view draft and published projects.
  // Anonymous callers and non-admin users can view ONLY published projects.
  const baseQuery = supabase
    .from('projects')
    .select('*')
    .eq('slug', slug);

  const { data: project, error: dbError } = isVerifiedAdmin
    ? await baseQuery.maybeSingle()
    : await baseQuery.eq('status', 'published').maybeSingle();

  if (dbError || !project) {
    notFound();
  }

  // Assemble common case-study data
  const assembled = await assembleCaseStudyData(project, supabase);

  return (
    <CaseStudyArticle
      {...assembled}
      banner={
        <>
          {/* Dev Preview Sticky Notice */}
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs font-mono text-amber-900 dark:text-amber-200 text-center flex items-center justify-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden="true" />
            <span>
              <strong>DEVELOPMENT PREVIEW ONLY</strong> — Testing reusable case study architecture on live Supabase slug: <code className="font-semibold underline">{slug}</code>
            </span>
          </div>

          {/* Admin Draft Preview Notice (rendered only when viewing an unpublished draft) */}
          {project.status === 'draft' && (
            <div className="bg-purple-500/10 border-b border-purple-500/20 px-4 py-2.5 text-xs font-mono text-purple-900 dark:text-purple-200 text-center flex items-center justify-center gap-2">
              <ShieldAlert className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" aria-hidden="true" />
              <span>
                <strong>ADMIN DRAFT PREVIEW</strong> — This case study is an <strong>unpublished draft</strong> visible strictly to verified administrators.
              </span>
            </div>
          )}
        </>
      }
    />
  );
}
