import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage Component (Unit Test)", () => {
  it("renders the primary heading with the owner name", () => {
    render(<HomePage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeDefined();
    expect(heading.textContent).toContain("Ashrafuzzaman Khalid");
  });

  it("renders candidate engineering project highlights", () => {
    render(<HomePage />);
    expect(screen.getByText("Web-LAN-Chat")).toBeDefined();
    expect(screen.getByText("BanglaScript Compiler")).toBeDefined();
    expect(screen.getByText("Clean Later")).toBeDefined();
    expect(screen.getByText("Brain Tumor Grade Classification")).toBeDefined();
  });

  it("contains clear notice of active development under Milestone M04", () => {
    render(<HomePage />);
    const notice = screen.getByText(/Milestone 01 Deployed Shell/i);
    expect(notice).toBeDefined();
  });

  it("verifies sensitive private information is strictly absent from DOM", () => {
    const { container } = render(<HomePage />);
    const content = container.textContent || "";

    // Asserts no phone numbers, residential address, private CGPA or credential leaks
    expect(content).not.toMatch(/(?:\+?880\s*|0)1[3-9]\d{8}/);
    expect(content).not.toMatch(/(?:house\s*#?|road\s*#?|flat\s*#?|holding\s*#?|ward\s*#?|post\s*code\s*[:#]?\s*\d{4})/i);
    expect(content).not.toMatch(/(?:password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*['"]?[a-zA-Z0-9_!@#$%^&*]{4,}/i);
    expect(content).not.toMatch(/(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|bearer\s+[a-zA-Z0-9_\-\.]{20,})/i);
    expect(content).not.toMatch(/(?:cgpa\s*[:=]?\s*[0-4]\.\d{2})/i);
  });
});
