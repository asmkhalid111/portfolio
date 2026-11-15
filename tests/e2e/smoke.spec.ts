import { test, expect } from "@playwright/test";

test.describe("M01 Foundation Smoke & Accessibility Suite", () => {
  test("loads homepage with status 200 and correct document title", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(
      "Ashrafuzzaman Khalid — Software Engineering Portfolio"
    );
  });

  test("contains accessible semantic document structure and skip link", async ({ page }) => {
    await page.goto("/");

    // Verify lang attribute on html element
    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang).toBe("en");

    // Verify skip-to-content accessibility link
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toContainText("Skip to main content");

    // Verify semantic landmark elements
    const header = page.locator("header");
    await expect(header).toBeVisible();

    const main = page.locator("main#main-content");
    await expect(main).toBeVisible();

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("renders valid heading hierarchy and hero content", async ({ page }) => {
    await page.goto("/");

    // Verify h1 presence and content
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText("Ashrafuzzaman Khalid");

    // Verify secondary headings exist
    const h2Elements = page.locator("h2");
    const count = await h2Elements.count();
    expect(count).toBeGreaterThan(0);
  });

  test("verifies responsive viewport without horizontal overflow", async ({ page }) => {
    await page.goto("/");

    // Verify no horizontal overflow in the viewport
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBe(false);
  });

  test("verifies candidate project highlights are visible", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Web-LAN-Chat")).toBeVisible();
    await expect(page.locator("text=BanglaScript Compiler")).toBeVisible();
    await expect(page.locator("text=Clean Later")).toBeVisible();
  });

  test("confirms Tailwind CSS styles are compiled and applied in production build", async ({ page }) => {
    await page.goto("/");

    // Verify computed styles on hero h1 element (font-extrabold -> font-weight: 800)
    const h1 = page.locator("h1");
    await expect(h1).toHaveCSS("font-weight", "800");

    // Verify computed styles on hero primary CTA button (Tailwind classes: flex, rounded-lg -> 8px border-radius)
    const heroGithubBtn = page.locator("main").getByRole("link", { name: "GitHub Profile", exact: true });
    await expect(heroGithubBtn).toHaveCSS("display", "flex");
    await expect(heroGithubBtn).toHaveCSS("border-radius", "8px");

    // Verify Tailwind v4 wide-gamut / modern color compilation on button background
    const btnBg = await heroGithubBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(btnBg).toMatch(/^(lab|oklch|rgb)/);

    // Verify computed style for header (sticky positioning)
    const header = page.locator("header");
    await expect(header).toHaveCSS("position", "sticky");
  });
});
