"use client";

import { ArrowUpRight } from "lucide-react";
import Link, { useLinkStatus } from "next/link";

function CaseStudyLinkLabel() {
  const { pending } = useLinkStatus();
  return <>
    Read case study <ArrowUpRight size={16} aria-hidden="true" />
    <span className="sr-only" role="status">{pending ? "Opening case study" : ""}</span>
  </>;
}

export function ProjectCardLink({ slug, title, className }: {
  slug: string;
  title: string;
  className?: string;
}) {
  return (
    <Link href={`/projects/${slug}`} className={className} aria-label={`Read case study: ${title}`}>
      <CaseStudyLinkLabel />
    </Link>
  );
}
