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
    await expect(visitor.locator("#projects").getByRole("link", { name: publishedTitle, exact: true })).toHaveCount(0);
    await expect(visitor.locator("#projects").getByRole("link", { name: draftTitle, exact: true })).toHaveCount(0);
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
    await expect(visitor.locator("#projects").getByRole("link", { name: publishedTitle, exact: true })).toHaveAttribute("href", publicPath);
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

test("keeps the showcase frame and controls still when projects change", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const showcase = page.getByRole("region", { name: "Selected work" });
  await expect(showcase).toBeVisible();
  const next = showcase.getByRole("button", { name: "Next project" });
  test.skip((await next.count()) === 0, "Requires at least two published projects with showcase media");
  const firstTitle = await showcase.getByRole("heading", { level: 3 }).innerText();
  const readLayout = () => showcase.evaluate((section) => {
    const outer = section.getBoundingClientRect();
    const preview = section.querySelector('[data-depth="0"]')!.getBoundingClientRect();
    const control = section.querySelector('[aria-label="Next project"]')!.getBoundingClientRect();
    return {
      height: outer.height,
      preview: [preview.x - outer.x, preview.y - outer.y, preview.width, preview.height],
      control: [control.x - outer.x, control.y - outer.y],
    };
  });

  const initial = await readLayout();
  await next.click();
  await expect(showcase.getByRole("heading", { level: 3 })).not.toHaveText(firstTitle);
  expect(await readLayout()).toEqual(initial);
  await showcase.getByRole("button", { name: "Previous project" }).click();
  await expect(showcase.getByRole("heading", { level: 3 })).toHaveText(firstTitle);
  expect(await readLayout()).toEqual(initial);
});
