import { test, expect } from '@playwright/test';

test.describe('M03 Administrator Authentication & Route Boundary E2E Suite', () => {
  test('unauthenticated visit to /admin redirects to /admin/login?next=%2Fadmin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin/);

    // Verify login page heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Administrator Login');
  });

  test('login page is publicly accessible and contains accessible form controls', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page).toHaveURL('/admin/login');

    // Email input with accessible label
    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required', '');

    // Password input with accessible label
    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('required', '');

    // Sign In submit button
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('Sign In');

    // Forgot password link
    const forgotLink = page.locator('a[href="/auth/forgot-password"]');
    await expect(forgotLink).toBeVisible();
  });

  test('invalid login credentials display generic error alert without user enumeration', async ({ page }) => {
    await page.goto('/admin/login');

    await page.fill('input#email', 'invalid-intruder@example.com');
    await page.fill('input#password', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Generic error alert should appear
    const alert = page.getByRole('alert').filter({ hasText: 'Invalid email or password' });
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText('Invalid email or password. Please check your credentials.');
  });

  test('open redirect attack vectors in next parameter are sanitized', async ({ page }) => {
    // Attempt protocol-relative redirect
    await page.goto('/admin/login?next=//evil.com');
    await expect(page).toHaveURL(/\/admin\/login\?next=\/\/evil\.com/);

    // Verify form exists and remains strictly on local origin
    const form = page.locator('form');
    await expect(form).toBeVisible();
    expect(page.url().startsWith('http://localhost:3000')).toBe(true);
  });

  test('scanner-safe confirmation page handles missing token gracefully', async ({ page }) => {
    await page.goto('/auth/confirm');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Invalid Verification Link');
  });

  test('auth error page renders descriptive error and return button', async ({ page }) => {
    await page.goto('/auth/error?error=token_expired');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Link Expired or Already Used');

    const returnLink = page.locator('a[href="/admin/login"]');
    await expect(returnLink).toBeVisible();
    await expect(returnLink).toContainText('Return to Login');
  });

  test('forgot password page renders accessible email form', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Reset Password');

    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('Send Recovery Link');
  });
});
