import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { Github, ExternalLink } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-2 px-4 sm:px-8">
        <Link
          href="/"
          className="min-w-0 text-sm font-semibold sm:text-base tracking-tight text-gray-900 transition-colors hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
        >
          Ashrafuzzaman Khalid
        </Link>
        <nav aria-label="Main Navigation" className="flex shrink-0 items-center gap-3 sm:gap-6">
          <Link
            href="/#projects"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Projects
          </Link>
          <Link
            href="/#about"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            About
          </Link>
          <a
            href="https://github.com/asmkhalid111"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            aria-label="GitHub Profile (opens in a new tab)"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">GitHub</span>
            <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
