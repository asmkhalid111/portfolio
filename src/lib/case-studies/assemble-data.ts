import { getGitHubCaseStudy, type GitHubDocumentResult } from '@/lib/github/sync';
import { getArchitectureExhibit, type ArchitectureExhibit } from '@/lib/case-studies/architecture-exhibits';
import type { MediaItem } from '@/components/case-study/MediaGalleryBlock';
import type { Chapter } from '@/components/case-study/StickyChapterNav';
import type { Database } from '@/lib/supabase/types';

export interface CaseStudyProjectInput {
  id?: string;
  slug: string;
  title: string;
  summary?: string | null;
  problem?: string | null;
  approach?: string | null;
  outcome?: string | null;
  technologies?: string[] | null;
  repository_url?: string | null;
  live_demo_url?: string | null;
  featured?: boolean | null;
  status?: string;
  [key: string]: unknown;
}

export interface AssembledCaseStudyData {
  project: CaseStudyProjectInput;
  galleryItems: MediaItem[];
  allChapters: Chapter[];
  githubResult: GitHubDocumentResult;
  architectureExhibit: ArchitectureExhibit | null;
  hasNarrative: boolean;
}

type ProjectMediaRow = Database['public']['Tables']['project_media']['Row'];

interface StorageBucket {
  getPublicUrl(path: string): { data?: { publicUrl?: string } };
}

interface SupabaseMediaClient {
  from(table: string): {
    select(columns?: string): {
      eq(column: string, value: string): {
        order(column: string, options?: { ascending?: boolean }): Promise<{ data: ProjectMediaRow[] | null; error: unknown }>;
      };
    };
  };
  storage?: {
    from(bucket: string): StorageBucket;
  };
}

/**
 * Assembles non-authorization-specific case-study data:
 * - Fetches remote GitHub documentation via getGitHubCaseStudy()
 * - Resolves media items (Supabase project_media rows with public storage URL or extracted README screenshots)
 * - Synthesizes chapters (Visual Artifacts, Architectural Overview, System Architecture Exhibit, Markdown chapters)
 * - Retrieves optional source-backed architecture exhibit
 */
export async function assembleCaseStudyData(
  project: CaseStudyProjectInput,
  supabase: SupabaseMediaClient | unknown
): Promise<AssembledCaseStudyData> {
  // 1. GitHub README fetch with fallback
  const githubResult = await getGitHubCaseStudy(project.repository_url);

  // 2. Resolve Media Items
  const galleryItems: MediaItem[] = [];

  const client = supabase as SupabaseMediaClient | undefined;

  if (project.id && client?.from) {
    const { data: mediaRows } = await client
      .from('project_media')
      .select('*')
      .eq('project_id', project.id)
      .order('sort_order', { ascending: true });

    if (mediaRows && mediaRows.length > 0) {
      mediaRows.forEach((row) => {
        let resolvedSrc = row.storage_path;
        if (!resolvedSrc.startsWith('http://') && !resolvedSrc.startsWith('https://')) {
          const { data } = client.storage?.from('project-media')?.getPublicUrl(row.storage_path) || {};
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
    }
  }

  // Fallback to extracted genuine README images if no database media rows
  if (galleryItems.length === 0 && githubResult.extractedImages && githubResult.extractedImages.length > 0) {
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

  // 3. Narrative presence check
  const hasNarrative = Boolean(
    (project.problem && project.problem.trim().length > 0) ||
      (project.approach && project.approach.trim().length > 0) ||
      (project.outcome && project.outcome.trim().length > 0)
  );

  // 4. Combine chapters from narrative, media, exhibit, and GitHub docs
  const allChapters: Chapter[] = [];

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

  // Optional Source-Backed Architecture Exhibit
  const architectureExhibit = getArchitectureExhibit(project.slug);
  if (architectureExhibit) {
    allChapters.push({
      id: 'system-architecture',
      title: 'System Architecture',
      level: 2,
    });
  }

  if (githubResult.success && githubResult.chapters.length > 0) {
    githubResult.chapters.forEach((ch) => {
      if (!allChapters.some((existing) => existing.id === ch.id)) {
        allChapters.push(ch);
      }
    });
  }

  return {
    project,
    galleryItems,
    allChapters,
    githubResult,
    architectureExhibit,
    hasNarrative,
  };
}
