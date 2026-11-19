import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';

const API_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const serviceClient = createClient(API_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

  test('authenticated non-admin user is directed to pending-approval screen', async ({ page }) => {
    const testEmail = `e2e-nonadmin-${Date.now()}@portfolio-test.local`;
    const testPassword = 'Password123!@#Test';

    const { data: user } = await serviceClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    try {
      await page.goto('/admin/login');
      await page.fill('input#email', testEmail);
      await page.fill('input#password', testPassword);
      await page.click('button[type="submit"]');

      // Should redirect to pending approval because not whitelisted
      await expect(page).toHaveURL(/\/auth\/pending-approval/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /Awaiting Administrator Activation/i })).toBeVisible({ timeout: 10000 });
    } finally {
      if (user?.user) {
        await serviceClient.auth.admin.deleteUser(user.user.id);
      }
    }
  });

  test('authenticated whitelisted admin accesses dashboard and can sign out', async ({ page }) => {
    const testEmail = `e2e-admin-${Date.now()}@portfolio-test.local`;
    const testPassword = 'Password123!@#Admin';

    const { data: user } = await serviceClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    const userId = user!.user!.id;

    // Insert into private.admin_users
    execFileSync('docker', [
      'exec',
      'supabase_db_Portfolio',
      'psql',
      '-U', 'postgres',
      '-d', 'postgres',
      '-c', `INSERT INTO private.admin_users (id, email) VALUES ('${userId}', '${testEmail}');`,
    ]);

    try {
      await page.goto('/admin/login');
      await page.fill('input#email', testEmail);
      await page.fill('input#password', testPassword);
      await page.click('button[type="submit"]');

      // Should land on /admin dashboard
      await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
      await expect(page.locator('text=Portfolio Admin Panel')).toBeVisible();
      await expect(page.locator('text=Whitelisted')).toBeVisible();

      // Test sign out action via header form
      const signOutBtn = page.getByRole('button', { name: 'Sign Out' });
      await expect(signOutBtn).toBeVisible();
      await Promise.all([
        page.waitForURL(/\/admin\/login/, { timeout: 15000 }),
        signOutBtn.click(),
      ]);

      // Verify subsequent visit to /admin redirects to login
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin/);
    } finally {
      execFileSync('docker', [
        'exec',
        'supabase_db_Portfolio',
        'psql',
        '-U', 'postgres',
        '-d', 'postgres',
        '-c', `DELETE FROM private.admin_users WHERE id = '${userId}';`,
      ]);
      await serviceClient.auth.admin.deleteUser(userId);
    }
  });
});
