import { expect, test } from "@playwright/test";

test("retains a manual theme choice across pages and reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  const toggle = page.getByRole("button", { name: "Dark theme" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");

  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Administrator Login" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await toggle.click();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.getByRole("heading", { name: "Administrator Login" })).toBeVisible();
});

test("shows BornoMala first with reduced-motion playback available on request", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.goto("/");

  const showcase = page.getByRole("region", { name: "Selected work" });
  await expect(showcase.getByRole("heading", { name: /BornoMala/ })).toBeVisible();
  await expect(showcase.getByRole("link", { name: "Read case study" })).toHaveAttribute("href", "/projects/bornomala");
  const play = showcase.getByRole("button", { name: "Play project preview" });
  await expect(play).toBeVisible();
  await expect(showcase.locator("video")).toHaveCount(0);
  await play.focus();
  await expect(play).toBeFocused();
  await play.press("Enter");
  await expect(showcase.locator("video")).toHaveCount(1);
  await showcase.getByRole("button", { name: "Pause project preview" }).click();
  await expect(showcase.locator("video")).toHaveCount(0);
  const toggle = page.getByRole("button", { name: "Dark theme" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await showcase.getByRole("link", { name: "Read case study" }).click();
  await expect(page).toHaveURL(/\/projects\/bornomala$/);
  await expect(page.getByRole("heading", { level: 1, name: /BornoMala/ })).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
});

test("published changes in admin are reflected for anonymous visitors", async ({ browser, page }) => {
  const email = process.env.PORTFOLIO_E2E_ADMIN_EMAIL;
  const password = process.env.PORTFOLIO_E2E_ADMIN_PASSWORD;
  test.skip(process.env.PORTFOLIO_E2E_LOCAL_CRUD !== "1" || !email || !password,
    "Requires a confirmed loopback Supabase stack and a disposable local administrator");
  if (!email || !password) return;
  const target = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "about:blank");
  expect(["127.0.0.1", "localhost"]).toContain(target.hostname);

  const suffix = crypto.randomUUID();
  const slug = "e2e-portfolio-" + suffix;
  const draftTitle = "Homepage CRUD " + suffix;
  const publishedTitle = draftTitle + " published";
  const listPath = "/admin/projects";
  const publicPath = "/projects/" + slug;
  await page.goto("/admin/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByText("Portfolio Admin Panel", { exact: true })).toBeVisible();

  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  const saveChanges = page.getByRole("button", { name: "Save Changes" });

  async function assertHidden() {
    await visitor.goto("/");
    await expect(visitor.locator("#projects").getByRole("link", { name: "Read case study: " + publishedTitle, exact: true })).toHaveCount(0);
    await expect(visitor.locator("#projects").getByRole("link", { name: "Read case study: " + draftTitle, exact: true })).toHaveCount(0);
    await visitor.goto(publicPath);
    await expect(visitor.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  }

  function projectRow() {
    return page.getByRole("row").filter({ hasText: draftTitle });
  }

  async function removeFixture() {
    await page.goto(listPath);
    const row = projectRow();
    if (await row.count() === 0) return;
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: /^Delete / }).click();
    await expect(row).toHaveCount(0);
  }

  try {
    await page.goto(listPath + "/new");
    await page.locator("#title").fill(draftTitle);
    await page.locator("#slug").fill(slug);
    await page.locator("#summary").fill("Disposable fixture for the M04 public project lifecycle.");
    await page.locator("#status").selectOption("draft");
    await page.getByRole("button", { name: "Create Project" }).click();
    await expect(page).toHaveURL(/\/admin\/projects$/);
    await expect(projectRow()).toBeVisible();
    await assertHidden();

    await projectRow().getByRole("link", { name: "Edit" }).click();
    await page.locator("#title").fill(publishedTitle);
    await page.locator("#status").selectOption("published");
    await saveChanges.click();
    await expect(page).toHaveURL(/\/admin\/projects$/);
    await visitor.goto("/");
    await expect(visitor.locator("#projects").getByRole("link", { name: "Read case study: " + publishedTitle, exact: true })).toHaveAttribute("href", publicPath);
    await visitor.goto(publicPath);
    await expect(visitor.getByRole("heading", { level: 1, name: publishedTitle })).toBeVisible();

    await projectRow().getByRole("link", { name: "Edit" }).click();
    await page.locator("#status").selectOption("draft");
    await saveChanges.click();
    await expect(page).toHaveURL(/\/admin\/projects$/);
    await assertHidden();
  } finally {
    try {
      await removeFixture();
    } finally {
      await anonymous.close();
    }
  }
});

test("keeps reduced-motion project cards clean and supports hero navigation", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const gallery = page.getByRole("region", { name: "Projects" });
  const lead = gallery.locator('article[data-lead="true"]');
  await expect(lead.getByRole("link", { name: /BornoMala/ })).toHaveAttribute("href", "/projects/bornomala");
  await expect(gallery.getByRole("heading", { name: "More projects" })).toHaveCount(0);
  await expect(lead.getByRole("button")).toHaveCount(0);
  await expect(lead.locator("video")).toHaveCount(0);
  const showcase = page.getByRole("region", { name: "Selected work" });
  await showcase.getByRole("button", { name: "Next project" }).click();
  await expect(showcase.getByRole("link", { name: "Read case study" })).toHaveAttribute("href", "/projects/stone-bridge-holdings");
  await showcase.getByRole("button", { name: "Previous project" }).click();
  await expect(showcase.getByRole("link", { name: "Read case study" })).toHaveAttribute("href", "/projects/bornomala");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth)
  );
  const caseStudy = lead.getByRole("link", { name: /Read case study: BornoMala/ });
  await caseStudy.scrollIntoViewIfNeeded();
  await caseStudy.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: /BornoMala/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Featured Work", { exact: true })).toBeVisible();
  await expect(page.getByText("Artifact Specimen:", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Full Technology Inventory" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ready to explore other projects?" })).toBeVisible();
  await expect(page.locator("main video[controls]")).toHaveCount(0);
  await page.locator("#back-to-projects-top").press("Enter");
  await expect(page).toHaveURL(/\/#projects$/);
  await expect(caseStudy).toBeVisible();
});

test("plays the desktop card preview only while hovered", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop hover interaction");
  await page.goto("/#projects");
  const card = page.locator("#project-bornomala");
  const poster = card.getByRole("img", { name: /BornoMala phonetic sandbox/ });
  await expect(poster).toBeVisible();
  await expect(card.locator("video")).toHaveCount(0);
  await poster.scrollIntoViewIfNeeded();
  const before = await card.evaluate((element) => element.clientHeight);
  await poster.hover();
  await expect(card.locator('video[data-playing="true"]')).toBeVisible();
  expect(await card.evaluate((element) => element.clientHeight)).toEqual(before);
  await card.getByRole("link", { name: /Read case study: BornoMala/ }).hover();
  await expect(card.locator("video")).toHaveCount(0);
});
