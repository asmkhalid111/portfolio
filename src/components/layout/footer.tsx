import { Github } from "lucide-react";

const CURRENT_YEAR = 2026;

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-10 dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Ashrafuzzaman Khalid &middot; Portfolio Foundation
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            &copy; {CURRENT_YEAR}. Built with Next.js 16 (Active LTS) &amp; TypeScript.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-400/20">
            M01 Deployed Shell
          </span>
          <a
            href="https://github.com/asmkhalid111"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-gray-900 dark:hover:text-gray-100"
            aria-label="GitHub Repository & Profile"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            <span>asmkhalid111</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
