import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Suspense, use } from "react";
import { ProjectPreview, type PreviewMedia } from "@/components/home/ProjectPreview";
import { ProjectShowcase } from "@/components/home/ProjectShowcase";
import { HomeSection } from "@/components/home/HomeSection";
import { createClient } from "@/lib/supabase/server";
import styles from "./home.module.css";
import { addReadmePreviews, heroProjectSlugs, projectPreview, projectIntro } from "@/lib/case-studies/project-preview";
import { parseGitHubRepo } from "@/lib/github/sync";
import { ProjectCardLink } from "@/components/home/ProjectCardLink";

// Verified CV information from docs/CONTENT_INVENTORY.md
const PROFILE = {
  name: "Ashrafuzzaman Khalid",
  location: "Dhaka, Bangladesh",
  bio: "I study Computer Science and Engineering at Daffodil International University. I build tools around problems I care about, from typing Bangla offline to exploring architectural drawings on the web. I define the scope and technical direction, then use AI to help implement and verify the work.",
  githubUrl: "https://github.com/asmkhalid111",
  linkedinUrl: "https://www.linkedin.com/in/asmkhalid101/",
};

const EDUCATION = [
  {
    institution: "Daffodil International University",
    degree: "Bachelor of Science in Computer Science & Engineering (B.Sc. CSE)",
    period: "2023 – Present",
    grade: "CGPA: 3.67 / 4.00",
  },
  {
    institution: "Milestone College",
    degree: "Higher Secondary Certificate (HSC), Science",
    period: "2021",
    grade: "GPA: 5.00 / 5.00",
  },
  {
    institution: "Saint Nicholas High School",
    degree: "Secondary School Certificate (SSC), Science",
    period: "2019",
    grade: "GPA: 4.89 / 5.00",
  },
];

const SKILL_GROUPS = [
  {
    category: "AI-assisted development",
    description: "Writing specifications, giving coding agents the relevant context, and reviewing their plans and changes.",
  },
  {
    category: "Product and architecture",
    description: "Defining MVP scope and requirements, choosing how system components fit together, and documenting trade-offs.",
  },
  {
    category: "Software delivery",
    description: "Using Git and GitHub to track changes, reviewing test evidence, and writing technical documentation.",
  },
];

export const instant = false;

function ReadmePreview({ details, title, technologies }: {
  details: Promise<PreviewMedia>;
  title: string;
  technologies: string[];
}) {
  return <ProjectPreview title={title} technologies={technologies} media={use(details)} />;
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, slug, summary, technologies, repository_url, live_demo_url, featured, project_media(id, storage_path, alt_text, sort_order)")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const projects = (error ? [] : data ?? []).map((project) => ({
    ...project,
    media: projectPreview(supabase, project),
  }));
  const featured = projects.filter((project) => project.featured);
  const lead = featured[0] ?? projects.find((project) => project.slug === "bornomala") ?? projects[0];
  const gallery = lead ? [lead, ...projects.filter((project) => project !== lead)] : [];
  const curated = heroProjectSlugs.flatMap((slug) => {
    const project = projects.find((entry) => entry.slug === slug);
    return project ? [project] : [];
  });
  const showcase = [...new Set([
    ...curated,
    ...gallery.slice(0, 1),
    ...featured.filter(({ media }) => media.still || media.animation),
    ...gallery.filter(({ media }) => media.still || media.animation),
  ])].slice(0, 3);

  return (
    <div className={styles.home}>
      <div className={styles.hero} data-showcase={Boolean(lead)}>
        <section className={styles.intro} aria-labelledby="intro-heading">
          <p className={styles.location}>{PROFILE.location}</p>
          <div>
            <h1 id="intro-heading">{PROFILE.name}</h1>
            <p className={styles.heroCopy}>
              I am a CSE student building software with AI assistance, from Bangla input tools to interactive websites.
            </p>
            <div className={styles.actions}>
              <Link href="#projects" className={styles.primary}>
                Explore work <ArrowDown size={17} aria-hidden="true" />
              </Link>
              <Link href="#about" className={styles.textLink}>About me</Link>
            </div>
          </div>
        </section>
        {lead && <ProjectShowcase slides={showcase} />}
      </div>

      <HomeSection id="projects" className={styles.section}>
        <h2 id="projects-heading">Projects</h2>
        {error ? (
          <p>Unable to load portfolio projects at this time.</p>
        ) : projects.length === 0 ? (
          <p>No published projects yet.</p>
        ) : (
          <div className={styles.projectGallery}>
            {gallery.map((project) => {
              const technologies = project.technologies ?? [];
              const caption = projectIntro(project);
              const preview = <ProjectPreview title={project.title} technologies={technologies} media={project.media} />;
              const remote = project.repository_url && (!project.media.still || !project.media.animation)
                && parseGitHubRepo(project.repository_url)
                ? addReadmePreviews(project.repository_url, project.media, project.title)
                : null;
              return (
                <article id={`project-${project.slug}`} className={styles.project} data-home-reveal="" key={project.id} data-lead={project === lead}>
                  {remote ? (
                    <Suspense fallback={preview}>
                      <ReadmePreview details={remote} title={project.title} technologies={technologies} />
                    </Suspense>
                  ) : preview}
                  <div className={styles.projectCopy}>
                    <h3>{project.title}</h3>
                    {caption && <p>{caption}</p>}
                    <div className={styles.projectLinks}>
                      <ProjectCardLink slug={project.slug} title={project.title} className={styles.cardAction} />
                      {project.repository_url && <a href={project.repository_url} target="_blank" rel="noopener noreferrer">Source code</a>}
                      {project.live_demo_url && <a href={project.live_demo_url} target="_blank" rel="noopener noreferrer">Live demo</a>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </HomeSection>

      <HomeSection id="about" className={styles.section}>
        <h2 id="about-heading" data-home-reveal="">About</h2>
        <div className={styles.background}>
          <div className={styles.aboutProfile} data-home-reveal="">
            <p className={styles.bio}>{PROFILE.bio}</p>
            <section id="education" aria-labelledby="education-heading">
              <h3 id="education-heading">Education</h3>
              {EDUCATION.map((item) => (
                <div className={styles.educationEntry} key={item.institution}>
                  <h4>{item.institution}</h4>
                  <p>{item.degree}</p>
                  <p className={styles.detail}>{item.period} / {item.grade}</p>
                </div>
              ))}
            </section>
          </div>

          <section id="skills" aria-labelledby="skills-heading" data-home-reveal="">
            <h3 id="skills-heading">How I work</h3>
            <dl>
              {SKILL_GROUPS.map((group) => (
                <div key={group.category}>
                  <dt>{group.category}</dt>
                  <dd>{group.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </HomeSection>

      <HomeSection id="contact" className={styles.section}>
        <h2 id="contact-heading" data-home-reveal="">Get in touch</h2>
        <p className={styles.bio}>I’m open to early-career software roles and conversations about the projects here.</p>
        <div className={styles.actions} data-home-reveal="">
          <a className={styles.textLink} href={PROFILE.linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a>
          <a className={styles.textLink} href={PROFILE.githubUrl} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </HomeSection>
    </div>
  );
}
