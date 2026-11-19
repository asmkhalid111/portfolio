import {
  GraduationCap,
  Briefcase,
  Code2,
  Terminal,
  ArrowUpRight,
  MapPin,
  Linkedin,
  Github,
  Layers,
  Cpu,
  Database,
  Wrench,
  FolderKanban,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

// Verified CV information from docs/CONTENT_INVENTORY.md
const PROFILE = {
  name: "Ashrafuzzaman Khalid",
  headline: "Computer Science & Engineering Student · Systems & Software Developer",
  location: "Dhaka, Bangladesh",
  bio: "Undergraduate student in Computer Science & Engineering at Daffodil International University. Passionate about software engineering fundamentals, systems programming, backend architectures, and compiler mechanics. Experienced in Java backend development, Python systems, and modern web application development.",
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
];

const EXPERIENCE = [
  {
    company: "Codveda Technologies",
    role: "Java Development Intern",
    type: "Remote Internship",
    period: "May 2026 – July 2026",
    description:
      "Developed Java applications using core Java concepts and object-oriented programming. Built structured console-based applications to solve algorithmic and logical challenges.",
    skills: ["Java", "Object-Oriented Programming"],
  },
];

const SKILL_GROUPS = [
  {
    category: "Programming Languages",
    icon: Code2,
    skills: ["Python", "C", "C++", "Java", "JavaScript", "TypeScript", "SQL"],
  },
  {
    category: "Frameworks & Backend",
    icon: Cpu,
    skills: ["Spring Boot", "FastAPI", "Next.js", "Node.js", "WebSockets"],
  },
  {
    category: "Databases & Storage",
    icon: Database,
    skills: ["PostgreSQL (with RLS)", "SQLite", "Supabase"],
  },
  {
    category: "Testing & Engineering Tools",
    icon: Wrench,
    skills: ["Git", "GitHub", "pytest", "Selenium", "Playwright", "Vitest", "Linux / WSL"],
  },
];

export const instant = false;

export default async function HomePage() {
  const supabase = await createClient();

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, title, slug, summary, technologies, repository_url, live_demo_url, featured")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20 space-y-16">
      {/* 1. Hero / About Section */}
      <section id="about" aria-labelledby="about-heading" className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-medium text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Software Engineering Portfolio</span>
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{PROFILE.location}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1
            id="about-heading"
            className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50"
          >
            {PROFILE.name}
          </h1>
          <p className="text-xl font-medium text-gray-600 sm:text-2xl dark:text-gray-400">
            {PROFILE.headline}
          </p>
        </div>

        <p className="max-w-3xl text-base leading-relaxed text-gray-700 sm:text-lg dark:text-gray-300">
          {PROFILE.bio}
        </p>

        {/* Profile Links */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href={PROFILE.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            <span>GitHub Profile</span>
            <ArrowUpRight className="h-4 w-4 opacity-75" aria-hidden="true" />
          </a>

          <a
            href={PROFILE.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Linkedin className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>LinkedIn</span>
            <ArrowUpRight className="h-4 w-4 opacity-75" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* 2. Education Section */}
      <section id="education" aria-labelledby="education-heading" className="space-y-6 border-t border-gray-200 pt-12 dark:border-gray-800">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h2 id="education-heading" className="text-2xl font-bold tracking-tight">
            Education
          </h2>
        </div>

        <div className="space-y-6">
          {EDUCATION.map((edu) => (
            <article
              key={edu.institution}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {edu.institution}
                </h3>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 sm:text-right">
                  {edu.period}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-800 dark:text-gray-200">{edu.degree}</span>
                <span>&middot;</span>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  {edu.grade}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. Internship Experience Section */}
      <section id="experience" aria-labelledby="experience-heading" className="space-y-6 border-t border-gray-200 pt-12 dark:border-gray-800">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h2 id="experience-heading" className="text-2xl font-bold tracking-tight">
            Work Experience
          </h2>
        </div>

        <div className="space-y-6">
          {EXPERIENCE.map((exp) => (
            <article
              key={exp.company}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {exp.role}
                  </h3>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {exp.company} <span className="text-xs text-gray-500 dark:text-gray-400">({exp.type})</span>
                  </p>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 sm:text-right">
                  {exp.period}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {exp.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {exp.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Published Projects Section */}
      <section id="projects" aria-labelledby="projects-heading" className="space-y-6 border-t border-gray-200 pt-12 dark:border-gray-800">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h2 id="projects-heading" className="text-2xl font-bold tracking-tight">
            Featured Projects
          </h2>
        </div>

        {projectsError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Unable to load portfolio projects at this time.</span>
            </div>
          </div>
        ) : !hasProjects ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center dark:border-gray-800 dark:bg-gray-900/30">
            <FolderKanban className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              No Published Projects Yet
            </h3>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Case studies and software engineering projects will appear here once published.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.id}
                className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900/60"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      <Link
                        href={`/projects/${project.slug}`}
                        className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {project.title}
                      </Link>
                    </h3>
                    {project.featured && (
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        Featured
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {project.summary}
                  </p>

                  {project.technologies && project.technologies.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {project.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <Link
                    href={`/projects/${project.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <span>View Case Study</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>

                  <div className="flex flex-wrap items-center gap-3">
                    {project.repository_url && (
                      <a
                        href={project.repository_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                      >
                        <Github className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Source Code</span>
                        <ArrowUpRight className="h-3 w-3 opacity-70" aria-hidden="true" />
                      </a>
                    )}

                    {project.live_demo_url && (
                      <a
                        href={project.live_demo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Live Demo</span>
                        <ArrowUpRight className="h-3 w-3 opacity-70" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 5. Technical Skills Section */}
      <section id="skills" aria-labelledby="skills-heading" className="space-y-6 border-t border-gray-200 pt-12 dark:border-gray-800">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h2 id="skills-heading" className="text-2xl font-bold tracking-tight">
            Technical Skills &amp; Competencies
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {SKILL_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <div
                key={group.category}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {group.category}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {group.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Contact & Profiles Section */}
      <section id="contact" aria-labelledby="contact-heading" className="space-y-6 border-t border-gray-200 pt-12 dark:border-gray-800">
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-900/40">
          <div className="max-w-2xl space-y-3">
            <h2 id="contact-heading" className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Get in Touch &amp; Professional Profiles
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Open to engineering discussions, software opportunities, and academic collaboration. Feel free to connect via LinkedIn or review my open-source code on GitHub.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-3">
              <a
                href={PROFILE.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 transition-colors hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                <span>github.com/asmkhalid111</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
              </a>

              <a
                href={PROFILE.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Linkedin className="h-4 w-4" aria-hidden="true" />
                <span>linkedin.com/in/asmkhalid101</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
