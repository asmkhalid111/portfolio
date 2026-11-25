import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import HomePage from "@/app/page";

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
    expect(screen.getByRole("heading", { name: /Technical Skills/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /Get in Touch/i })).toBeDefined();
  });

  it("renders published project highlights from mock Supabase client", async () => {
    const Component = await HomePage();
    render(Component);

    expect(screen.getByRole("heading", { name: "Projects" })).toBeDefined();
    expect(filterStatus).toHaveBeenCalledWith("status", "published");
    expect(screen.getByText("Web-LAN-Chat")).toBeDefined();
    expect(screen.getByText("BanglaScript Compiler")).toBeDefined();
  });

  it("leads with BornoMala and only includes preview projects returned by the published query", async () => {
    readResult.mockResolvedValueOnce({
      error: null,
      data: [
        { ...mockProjects[0], slug: "rainy-cityscape", title: "Rainy Cityscape" },
        { ...mockProjects[1], slug: "bornomala", title: "BornoMala" },
      ],
    });
    render(await HomePage());

    const showcase = within(screen.getByRole("region", { name: "Selected work" }));
    expect(showcase.getByText("01 / 02")).toBeDefined();
    expect(showcase.getByRole("link", { name: "Read case study" }).getAttribute("href")).toBe("/projects/bornomala");
    expect(screen.queryByText("Stone Bridge Holdings")).toBeNull();
    const projectGallery = within(screen.getByRole("region", { name: "Projects" }));
    expect(projectGallery.getByRole("img", { name: /BornoMala/ })).toBeDefined();
    expect(projectGallery.getByRole("link", { name: "Read the BornoMala case study" }).getAttribute("href")).toBe("/projects/bornomala");
    expect(showcase.getByRole("button", { name: "Play project preview" })).toBeDefined();
    expect(showcase.getByRole("button", { name: "Start automatic project switching" })).toBeDefined();
    fireEvent.click(showcase.getByRole("button", { name: "Next project" }));
    expect(showcase.getByText("02 / 02")).toBeDefined();
    expect(showcase.getByRole("link", { name: "Read case study" }).getAttribute("href")).toBe("/projects/rainy-cityscape");
    fireEvent.click(showcase.getByRole("button", { name: "Previous project" }));
    expect(showcase.getByText("01 / 02")).toBeDefined();
  });

  it("rotates visible projects and pauses when a project is picked or a rotation stop is requested", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.stubGlobal("IntersectionObserver", class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        if (target.hasAttribute("data-count")) {
          this.callback([{ intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
        }
      }
      disconnect() {}
    });

    readResult.mockResolvedValueOnce({
      error: null,
      data: [
        { ...mockProjects[0], slug: "rainy-cityscape", title: "Rainy Cityscape" },
        { ...mockProjects[1], slug: "bornomala", title: "BornoMala" },
      ],
    });
    const page = await HomePage();
    vi.useFakeTimers();
    render(page);

    const showcase = within(screen.getByRole("region", { name: "Selected work" }));
    const advance = () => act(() => vi.advanceTimersByTime(12_000));
    const selected = (project: string) => showcase.getByRole("button", { name: "Show " + project, pressed: true });

    expect(selected("BornoMala")).toBeDefined();
    advance();
    expect(selected("Rainy Cityscape")).toBeDefined();
    advance();
    expect(selected("BornoMala")).toBeDefined();

    fireEvent.click(showcase.getByRole("button", { name: "Show Rainy Cityscape" }));
    advance();
    expect(selected("Rainy Cityscape")).toBeDefined();

    fireEvent.click(showcase.getByRole("button", { name: "Start automatic project switching" }));
    advance();
    expect(selected("BornoMala")).toBeDefined();

    fireEvent.click(showcase.getByRole("button", { name: "Pause automatic project switching" }));
    advance();
    expect(selected("BornoMala")).toBeDefined();
    expect(showcase.getByRole("button", { name: "Pause project preview" })).toBeDefined();
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
