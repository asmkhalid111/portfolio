import { ArrowUpRight, Code2, Terminal, Cpu, Database, ShieldCheck } from "lucide-react";

interface ProjectHighlight {
  title: string;
  category: string;
  summary: string;
  tags: string[];
  githubUrl?: string;
}

const CANDIDATE_PROJECTS: ProjectHighlight[] = [
  {
    title: "Web-LAN-Chat",
    category: "Distributed Systems & Networking",
    summary:
      "A high-throughput local-network real-time messaging application featuring WebSocket bidirectional communication, secure password hashing, and persistent SQLite storage.",
    tags: ["FastAPI", "WebSockets", "SQLite", "pytest", "Selenium"],
    githubUrl: "https://github.com/asmkhalid111/Web-Lan-Chat",
  },
  {
    title: "BanglaScript Compiler",
    category: "Compilers & Language Design",
    summary:
      "A domain-specific bilingual programming language compiler that translates bilingual Bangla/English syntax into executable assembly using Flex lexical analysis and Bison parser generation.",
    tags: ["C/C++", "Flex", "Bison", "Assembly", "Compiler Design"],
    githubUrl: "https://github.com/asmkhalid111/Bangla-Compiler-Project",
  },
  {
    title: "Clean Later",
    category: "Browser Engineering & Tooling",
    summary:
      "A Manifest V3 browser extension for automated playlist hygiene on YouTube, built using asynchronous Chrome extension APIs and client-side DOM processing.",
    tags: ["JavaScript", "Chrome Extensions API", "Manifest V3"],
    githubUrl: "https://github.com/asmkhalid111/clean-later",
  },
  {
    title: "Brain Tumor Grade Classification",
    category: "Machine Learning & Research",
    summary:
      "Ongoing research analyzing RNA-seq genomic profiles from the TCGA dataset to classify glioma malignancy grades using deep learning architectures.",
    tags: ["Python", "PyTorch", "Bioinformatics", "TCGA RNA-seq"],
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
      {/* Hero Section */}
      <section aria-labelledby="hero-heading" className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-medium text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
          <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
          <span>CSE Student &middot; Software Engineering Foundation</span>
        </div>

        <div className="space-y-3">
          <h1
            id="hero-heading"
            className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50"
          >
            Ashrafuzzaman Khalid
          </h1>
          <p className="text-xl font-medium text-gray-600 sm:text-2xl dark:text-gray-400">
            Computer Science &amp; Engineering &middot; Systems &amp; Web Developer
          </p>
        </div>

        <p className="max-w-2xl text-base leading-relaxed text-gray-700 sm:text-lg dark:text-gray-300">
          I build maintainable software with an emphasis on systems fundamentals, network communication,
          compiler mechanics, and secure web application architectures. Currently pursuing my degree in
          Computer Science &amp; Engineering at Daffodil International University.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <a
            href="https://github.com/asmkhalid111"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus:ring-2 focus:ring-gray-400 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <span>GitHub Profile</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>

          <a
            href="https://www.linkedin.com/in/asmkhalid101/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <span>LinkedIn</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Architecture Disclaimer / Notice */}
      <section
        aria-label="Development Status"
        className="my-14 rounded-xl border border-amber-200/80 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20"
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
              Milestone 01 Deployed Shell
            </h2>
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-400">
              This site represents the foundational deployment for the portfolio project. Individual case study
              narratives and the authenticated administrator CRUD panel are actively staged for release under
              Milestones M02 through M04.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Projects Highlight */}
      <section id="projects" aria-labelledby="projects-heading" className="space-y-8 pt-4">
        <div className="space-y-1">
          <h2 id="projects-heading" className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Selected Engineering Projects
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Candidate implementations and technical systems developed across coursework, personal research, and open-source tooling.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {CANDIDATE_PROJECTS.map((project) => (
            <article
              key={project.title}
              className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
            >
              <div className="space-y-3">
                <span className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {project.category}
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {project.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {project.summary}
                </p>
              </div>

              <div className="pt-6">
                <div className="flex flex-wrap gap-1.5 pb-4">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-900 hover:underline dark:text-gray-100"
                  >
                    <span>View Repository</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Focus & Competencies Section */}
      <section id="about" aria-labelledby="about-heading" className="mt-16 space-y-6 border-t border-gray-200 pt-12 dark:border-gray-800">
        <h2 id="about-heading" className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Technical Focus &amp; Core Disciplines
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Code2 className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h3 className="text-sm font-bold">Systems &amp; Languages</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              C, C++, Java, Python, and TypeScript. Experience in compiler design, syntax parsing, and assembly translation.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h3 className="text-sm font-bold">Full-Stack Engineering</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Next.js 16 App Router, FastAPI, WebSocket networking, and responsive client-side architectures.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h3 className="text-sm font-bold">Databases &amp; Testing</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              PostgreSQL with Row-Level Security, SQLite, Vitest, and browser automated testing via Playwright and Selenium.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
