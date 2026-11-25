import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ProjectShowcase, type ShowcaseProject } from "@/components/home/ProjectShowcase";
import { HomeSection } from "@/components/home/HomeSection";
import { createClient } from "@/lib/supabase/server";
import styles from "./home.module.css";

// Verified CV information from docs/CONTENT_INVENTORY.md
const PROFILE = {
  name: "Ashrafuzzaman Khalid",
  location: "Dhaka, Bangladesh",
  bio: "I study Computer Science and Engineering at Daffodil International University. My projects start with a problem I want to solve. I define the scope and technical direction, then use AI to help implement and verify the work.",
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

const previews = [
  { slug: "bornomala", file: "bornomala", alt: "BornoMala phonetic sandbox showing Bangla typing and word suggestions" },
  { slug: "stone-bridge-holdings", file: "stone-bridge", liveUrl: "https://stonebridgeholdings-website.netlify.app", alt: "Stone Bridge Holdings homepage showing an architectural drawing in the website interface" },
  { slug: "rainy-cityscape", file: "rainy-cityscape", alt: "Rainy Cityscape simulation showing illuminated buildings in the rain" },
];

export const instant = false;

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, slug, summary, technologies, repository_url, live_demo_url, featured")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const projects = error ? [] : data ?? [];
  const selected = previews.flatMap((preview) => {
    const project = projects.find((row) => row.slug === preview.slug)
      ?? projects.find((row) => preview.liveUrl && row.live_demo_url?.replace(/\/$/, "") === preview.liveUrl);
    if (!project) return [];

    return [{
      ...project,
      poster: "/project-previews/" + preview.file + ".webp",
      clip: "/project-previews/" + preview.file + ".webm",
      alt: preview.alt,
    } satisfies ShowcaseProject & typeof project];
  });

  const illustrated = new Set(selected.map((project) => project.slug));
  const moreProjects = projects.filter((project) => !illustrated.has(project.slug));

  return (
    <div className={styles.home}>
      <div className={styles.hero} data-showcase={selected.length > 0}>
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
          <a className={styles.profileLink} href={PROFILE.githubUrl} target="_blank" rel="noopener noreferrer">
            GitHub Profile <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </section>
        {selected.length > 0 && <ProjectShowcase projects={selected.map(({ slug, title, summary, poster, clip, alt }) => ({ slug, title, summary, poster, clip, alt }))} />}
      </div>

      <HomeSection id="projects" className={styles.section}>
        <h2 id="projects-heading">Projects</h2>
        {error ? (
          <p>Unable to load portfolio projects at this time.</p>
        ) : projects.length === 0 ? (
          <p>No published projects yet.</p>
        ) : (
          <>
            {selected.length > 0 && (
              <div className={styles.projectGallery}>
                {selected.map((project) => (
                  <article className={styles.feature} data-home-reveal="" key={project.slug} data-lead={project.slug === "bornomala"}>
                    <Link href={"/projects/" + project.slug} className={styles.featureLink} aria-label={"Read the " + project.title + " case study"}>
                      <div className={styles.featureMedia}>
                        <Image src={project.poster} alt={project.alt} fill unoptimized sizes="(min-width: 48rem) 50vw, 100vw" />
                      </div>
                      <div className={styles.featureCaption}>
                        <div>
                          <h3>{project.title}</h3>
                          {project.summary && <p>{project.summary}</p>}
                        </div>
                        <ArrowUpRight size={23} aria-hidden="true" />
                      </div>
                    </Link>
                    <div className={styles.projectLinks}>
                      {project.repository_url && (
                        <a href={project.repository_url} target="_blank" rel="noopener noreferrer">Source code</a>
                      )}
                      {project.live_demo_url && (
                        <a href={project.live_demo_url} target="_blank" rel="noopener noreferrer">Live demo</a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
            {moreProjects.length > 0 && (
              <div className={styles.projectList}>
                {selected.length > 0 && <h3>More projects</h3>}
                {moreProjects.map((project) => (
                  <article className={styles.project} data-home-reveal="" key={project.id}>
                    <h3><Link href={"/projects/" + project.slug}>{project.title}</Link></h3>
                    <div>
                      <p>{project.summary}</p>
                      {!!project.technologies?.length && <p className={styles.detail}>{project.technologies.join(" / ")}</p>}
                    </div>
                    <div className={styles.projectLinks}>
                      <Link className={styles.textLink} href={"/projects/" + project.slug}>View case study</Link>
                      {project.repository_url && <a href={project.repository_url} target="_blank" rel="noopener noreferrer">Source code</a>}
                      {project.live_demo_url && <a href={project.live_demo_url} target="_blank" rel="noopener noreferrer">Live demo</a>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
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
            <h3 id="skills-heading">Technical Skills</h3>
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
        <div className={styles.actions} data-home-reveal="">
          <a className={styles.textLink} href={PROFILE.githubUrl} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={16} aria-hidden="true" /></a>
          <a className={styles.textLink} href={PROFILE.linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </HomeSection>
    </div>
  );
}
