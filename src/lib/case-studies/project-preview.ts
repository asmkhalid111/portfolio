import type { PreviewMedia } from "@/components/home/ProjectPreview";
import type { createClient } from "@/lib/supabase/server";
import { getGitHubCaseStudy } from "@/lib/github/sync";

const previews = [
  { slug: "bornomala", file: "bornomala", alt: "BornoMala phonetic sandbox showing Bangla typing and word suggestions" },
  { slug: "stone-bridge-holdings", file: "stone-bridge", liveUrl: "https://stonebridgeholdings-website.netlify.app", alt: "Stone Bridge Holdings homepage showing an architectural drawing in the website interface" },
  { slug: "rainy-cityscape", file: "rainy-cityscape", alt: "Rainy Cityscape simulation showing illuminated buildings in the rain" },
];

export const heroProjectSlugs = previews.map(({ slug }) => slug);

function addPreviewAsset(media: PreviewMedia, src: string, alt: string) {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return;
  }
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) || url.username || url.password) return;
  const asset = { src: url.href, alt };
  if (/\.gif$/i.test(url.pathname)) media.animation ??= { ...asset, kind: "gif" };
  else if (/\.(webm|mp4)$/i.test(url.pathname)) media.animation ??= { ...asset, kind: "video" };
  else if (/\.(avif|jpe?g|png|svg|webp)$/i.test(url.pathname)) media.still ??= asset;
}

export async function addReadmePreviews(repositoryUrl: string, media: PreviewMedia, title: string) {
  const result = await getGitHubCaseStudy(repositoryUrl);
  const resolved = { ...media };
  for (const asset of result.extractedImages ?? []) {
    addPreviewAsset(resolved, asset.src, asset.alt || title);
    if (resolved.still && resolved.animation) break;
  }
  return resolved;
}

export function projectPreview(supabase: Pick<Awaited<ReturnType<typeof createClient>>, "storage">, project: {
  title: string;
  slug: string;
  live_demo_url: string | null;
  project_media?: { storage_path: string; alt_text: string; sort_order: number; id: string }[];
}): PreviewMedia {
  const media: PreviewMedia = {};
  const rows = [...(project.project_media ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  for (const row of rows) {
    const path = row.storage_path.trim();
    if (!path || path.startsWith("/") || path.includes("\\")) continue;
    const src = /^(https?):\/\//i.test(path)
      ? path
      : supabase.storage.from("project-media").getPublicUrl(path).data.publicUrl;
    addPreviewAsset(media, src, row.alt_text || project.title);
  }
  if (project.slug === "web-lan-chat") {
    media.still ??= { src: "/project-previews/web-lan-chat.webp", alt: "Web-LAN-Chat conversation interface" };
  }
  const legacy = previews.find(({ slug }) => slug === project.slug)
    ?? previews.find(({ liveUrl }) => liveUrl && project.live_demo_url?.replace(/\/$/, "") === liveUrl);
  if (legacy) {
    media.still ??= { src: `/project-previews/${legacy.file}.webp`, alt: legacy.alt };
    media.animation ??= { src: `/project-previews/${legacy.file}.webm`, alt: legacy.alt, kind: "video" };
  }
  return media;
}

const cardCaptions: Record<string, string> = {
  bornomala: "Type Bangla offline with phonetic input and live word suggestions.",
  "stone-bridge-holdings": "Explore a building through animated architectural drawings.",
  "rainy-cityscape": "Watch a city shift between day and night in an interactive OpenGL simulation.",
  "web-lan-chat": "Chat in real time with people on the same local network.",
  "banglascript-compiler": "Write and run programs with Bangla or English keywords.",
  "clean-later": "Clear a YouTube Watch Later queue with a browser extension.",
};

export function projectIntro(project: { slug?: string; summary?: string | null }) {
  const slug = project.slug;
  return (slug && Object.hasOwn(cardCaptions, slug) ? cardCaptions[slug] : project.summary) ?? "";
}
