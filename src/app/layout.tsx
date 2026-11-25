import type { Metadata, Viewport } from "next";
import { Header } from "@/components/layout/header";
import { themeInitScript } from "@/lib/theme";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ashrafuzzaman Khalid — Software Engineering Portfolio",
  description:
    "Personal software engineering portfolio showcasing systems, compiler engineering, distributed chat applications, and research by Ashrafuzzaman Khalid.",
  authors: [{ name: "Ashrafuzzaman Khalid", url: "https://github.com/asmkhalid111" }],
  creator: "Ashrafuzzaman Khalid",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Ashrafuzzaman Khalid — Software Engineering Portfolio",
    description:
      "Personal portfolio and engineering case studies by Ashrafuzzaman Khalid, CSE student and software developer.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
