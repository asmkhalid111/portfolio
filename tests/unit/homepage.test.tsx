import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import HomePage from "@/app/page";
import { getGitHubCaseStudy } from "@/lib/github/sync";

vi.mock("@/lib/github/sync", async (original) => ({
  ...await original<typeof import("@/lib/github/sync")>(),
  getGitHubCaseStudy: vi.fn(),
}));

const { readResult, filterStatus } = vi.hoisted(() => ({
  readResult: vi.fn(),
  filterStatus: vi.fn(),
}));

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
        eq: filterStatus.mockImplementation(() => ({
          order: vi.fn(() => ({
            order: readResult,
          })),
        })),
      })),
    })),
  })),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("HomePage Component (Unit Test)", () => {
  beforeEach(() => {
    readResult.mockResolvedValue({ data: mockProjects, error: null });
    vi.mocked(getGitHubCaseStudy).mockResolvedValue({
      success: true, rawMarkdown: "", sourceUrl: "", defaultBranch: "main", chapters: [], extractedImages: [],
    });
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
  });
  it("renders the primary heading with the owner name and headline", async () => {
    const Component = await HomePage();
    render(Component);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeDefined();
    expect(heading.textContent).toContain("Ashrafuzzaman Khalid");
    expect(
      screen.getByText(/CSE student building software/i)
    ).toBeDefined();
  });

  it("renders verified CV sections (Education, Skills and Contact)", async () => {
    const Component = await HomePage();
    render(Component);

    expect(screen.getByRole("heading", { name: "Education" })).toBeDefined();
    const education = within(screen.getByRole("region", { name: "Education" }));
    expect(education.getAllByRole("heading", { level: 4 }).map((heading) => heading.textContent)).toEqual([
      "Daffodil International University",
      "Milestone College",
      "Saint Nicholas High School",
    ]);
    expect(education.getByText("Higher Secondary Certificate (HSC), Science")).toBeDefined();
    expect(education.getByText("2021 / GPA: 5.00 / 5.00")).toBeDefined();
    expect(education.getByText("Secondary School Certificate (SSC), Science")).toBeDefined();
    expect(education.getByText("2019 / GPA: 4.89 / 5.00")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Work Experience" })).toBeNull();
    expect(screen.getByText("AI-assisted development")).toBeDefined();
    expect(screen.getByRole("heading", { name: /How I work/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /Get in Touch/i })).toBeDefined();
  });

  it("renders published project highlights from mock Supabase client", async () => {
    const Component = await HomePage();
    render(Component);

    expect(screen.getByRole("heading", { name: "Projects" })).toBeDefined();
    expect(filterStatus).toHaveBeenCalledWith("status", "published");
    const gallery = within(screen.getByRole("region", { name: "Projects" }));
    expect(gallery.getByRole("link", { name: "Read case study: Web-LAN-Chat" })).toBeDefined();
    expect(gallery.getByRole("link", { name: "Read case study: BanglaScript Compiler" })).toBeDefined();
  });

  it("uses curated hero priority and renders custom and bundled media in the same gallery", async () => {
    readResult.mockResolvedValueOnce({
      error: null,
      data: [
        { ...mockProjects[1], slug: "bornomala", title: "BornoMala" },
        {
          ...mockProjects[0],
          slug: "newly-published",
          title: "Newly published",
          project_media: [
            { id: "still", storage_path: "https://example.com/cover.webp", alt_text: "New project screenshot", sort_order: 1 },
            { id: "demo", storage_path: "https://example.com/demo.gif", alt_text: "New project demo", sort_order: 0 },
          ],
        },
        { ...mockProjects[1], id: "no-media", slug: "no-media", title: "No Media" },
      ],
    });
    const component = await HomePage();
    await act(async () => { render(component); });

    const showcase = within(screen.getByRole("region", { name: "Selected work" }));
    expect(showcase.getByRole("link", { name: "Read case study" }).getAttribute("href")).toBe("/projects/bornomala");
    fireEvent.click(showcase.getByRole("button", { name: "Next project" }));
    expect(showcase.getByRole("link", { name: "Read case study" }).getAttribute("href")).toBe("/projects/newly-published");
    fireEvent.click(showcase.getByRole("button", { name: "Previous project" }));
    const gallery = within(screen.getByRole("region", { name: "Projects" }));
    const [lead, bundled, empty] = gallery.getAllByRole("article");
    expect(lead.getAttribute("data-lead")).toBe("true");
    expect(within(lead).getByRole("img", { name: "New project screenshot" })).toBeDefined();
    expect(within(lead).queryByRole("img", { name: "New project demo" })).toBeNull();
    expect(within(lead).queryByRole("button", { name: "Play project preview" })).toBeNull();
    expect(within(bundled).getByRole("img", { name: /BornoMala/ })).toBeDefined();
    expect(within(empty).getByRole("link", { name: "Read case study: No Media" }).getAttribute("href")).toBe("/projects/no-media");
    expect(within(empty).queryByRole("img")).toBeNull();
    expect(within(empty).getByText("C / C++ / Flex")).toBeDefined();
  });

  it("fills an ordinary project card from README media without promoting it to the curated hero", async () => {
    vi.mocked(getGitHubCaseStudy).mockImplementation(async (url) => ({
      success: true, rawMarkdown: "", sourceUrl: "", defaultBranch: "main", chapters: [],
      extractedImages: url?.includes("Bangla-Compiler") ? [
        { src: "https://raw.githubusercontent.com/example/compiler/main/terminal.png", alt: "Compiler output" },
        { src: "https://raw.githubusercontent.com/example/compiler/main/demo.gif", alt: "Compiler recording" },
      ] : [],
    }));
    const component = await HomePage();
    await act(async () => { render(component); });
    const gallery = within(screen.getByRole("region", { name: "Projects" }));
    expect(gallery.getByRole("img", { name: "Compiler output" })).toBeDefined();
    expect(gallery.queryByRole("img", { name: "Compiler recording" })).toBeNull();
  });

  it("keeps the work index available when the project query fails", async () => {
    readResult.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    render(await HomePage());

    expect(screen.queryByRole("region", { name: "Selected work" })).toBeNull();
    expect(screen.getByRole("link", { name: "Explore work" }).getAttribute("href")).toBe("#projects");
    expect(screen.getByText("Unable to load portfolio projects at this time.")).toBeDefined();
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
