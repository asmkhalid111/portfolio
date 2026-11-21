import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { CaseStudyArticle } from '@/components/case-study/CaseStudyArticle';
import { assembleCaseStudyData } from '@/lib/case-studies/assemble-data';

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
  if (!slug) {
    return {
      title: 'Project Not Found | Software Engineering Portfolio',
      robots: { index: false, follow: false },
    };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('title, summary, slug')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!project) {
    return {
      title: 'Project Not Found | Software Engineering Portfolio',
      robots: { index: false, follow: false },
    };
  }

  const pageTitle = `${project.title} — Case Study | Ashrafuzzaman Khalid`;
  const pageDescription =
    project.summary || `Technical software engineering case study for ${project.title}.`;

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: `${project.title} | Software Engineering Case Study`,
      description: pageDescription,
      type: 'article',
      url: `/projects/${project.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
    },
    alternates: {
      canonical: `/projects/${project.slug}`,
    },
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const supabase = await createClient();

  // Public Route Invariant: Strictly restricted to status = 'published'
  // Missing or draft projects invoke notFound() regardless of caller identity or admin role.
  const { data: project, error: dbError } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (dbError || !project) {
    notFound();
  }

  // Assemble case study data using the generic data layer
  const assembled = await assembleCaseStudyData(project, supabase);

  // Render clean public case study without development/preview banners
  return <CaseStudyArticle {...assembled} backHref="/#projects" />;
}
