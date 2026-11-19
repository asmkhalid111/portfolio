import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

const mockProjects = [
  {
    id: "proj-1",
    title: "Web-LAN-Chat",
    slug: "web-lan-chat",
    summary: "FastAPI and WebSockets communication platform.",
    technologies: ["Python", "FastAPI", "WebSockets"],
    repository_url: "https://github.com/asmkhalid111/Web-Lan-Chat",
    live_demo_url: null,
    featured: true,
  },
  {
    id: "proj-2",
    title: "BanglaScript Compiler",
    slug: "banglascript-compiler",
    summary: "Bilingual compiler with Flex and Bison.",
    technologies: ["C", "C++", "Flex", "Bison"],
    repository_url: "https://github.com/asmkhalid111/Bangla-Compiler-Project",
    live_demo_url: null,
    featured: false,
  },
];

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: mockProjects,
              error: null,
            })),
          })),
        })),
      })),
    })),
  })),
}));

describe("HomePage Component (Unit Test)", () => {
  it("renders the primary heading with the owner name and headline", async () => {
    const Component = await HomePage();
    render(Component);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeDefined();
    expect(heading.textContent).toContain("Ashrafuzzaman Khalid");
    expect(
      screen.getByText(/Computer Science & Engineering Student/i)
    ).toBeDefined();
  });

  it("renders verified CV sections (Education, Experience, Skills, Contact)", async () => {
    const Component = await HomePage();
    render(Component);

    expect(screen.getByRole("heading", { name: "Education" })).toBeDefined();
    expect(screen.getByText("Daffodil International University")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Work Experience" })).toBeDefined();
    expect(screen.getByText("Codveda Technologies")).toBeDefined();
    expect(screen.getByRole("heading", { name: /Technical Skills/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /Get in Touch/i })).toBeDefined();
  });

  it("renders published project highlights from mock Supabase client", async () => {
    const Component = await HomePage();
    render(Component);

    expect(screen.getByRole("heading", { name: "Featured Projects" })).toBeDefined();
    expect(screen.getByText("Web-LAN-Chat")).toBeDefined();
    expect(screen.getByText("BanglaScript Compiler")).toBeDefined();
  });

  it("verifies sensitive private information is strictly absent from DOM", async () => {
    const Component = await HomePage();
    const { container } = render(Component);
    const content = container.textContent || "";

    // Asserts no phone numbers, residential address, or credential/token leaks
    expect(content).not.toMatch(/(?:\+?880\s*|0)1[3-9]\d{8}/);
    expect(
      content
    ).not.toMatch(
      /(?:house\s*#?|road\s*#?|flat\s*#?|holding\s*#?|ward\s*#?|post\s*code\s*[:#]?\s*\d{4})/i
    );
    expect(
      content
    ).not.toMatch(
      /(?:password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*['"]?[a-zA-Z0-9_!@#$%^&*]{4,}/i
    );
    expect(
      content
    ).not.toMatch(
      /(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|bearer\s+[a-zA-Z0-9_\-\.]{20,})/i
    );
  });
});
