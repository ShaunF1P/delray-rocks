const { test, expect } = require('@playwright/test');

test.describe('Delray Rocks Web App - Playwright E2E Smoke Test Suite', () => {

  test('1. Coastal Public Landing Page - Structure & Form Rendering', async ({ page }) => {
    await page.goto('/coastal');

    // App page title check
    await expect(page).toHaveTitle(/Delray Rocks/i);
    
    // Sponsorship banner checks
    const sponsorshipBanner = page.locator('text=$1,000 Team Sponsorship');
    await expect(sponsorshipBanner).toBeVisible();

    // Check Proposal Link
    const proposalLink = page.locator('a:has-text("View Proposal Details")');
    await expect(proposalLink).toBeVisible();
    await expect(proposalLink).toHaveAttribute('href', '/coastal/proposal');

    // Check Form Inputs exist
    await expect(page.locator('#parent-first')).toBeVisible();
    await expect(page.locator('#parent-last')).toBeVisible();
    await expect(page.locator('#parent-email')).toBeVisible();
    await expect(page.locator('#parent-phone')).toBeVisible();
    await expect(page.locator('#player-name')).toBeVisible();
  });

  test('2. Coastal Sponsorship Proposal Page - Navigation & Content', async ({ page }) => {
    await page.goto('/coastal/proposal');

    // Expect proposal title or header
    const title = page.locator('h1, h2, h3').first();
    await expect(title).toBeVisible();
    
    // Check that sponsorship details text is rendered
    await expect(page.locator('body')).toContainText(/Coastal Community Church/i);
    await expect(page.locator('body')).toContainText(/Delray Rocks/i);
  });

  test('3. Login Page - Form Rendering & Security', async ({ page }) => {
    await page.goto('/login');

    // Expect login title/header
    await expect(page.locator('body')).toContainText(/Welcome back|Sign In/i);

    // Inputs check (username + password)
    const usernameInput = page.locator('#login-username');
    await expect(usernameInput).toBeVisible();

    const passwordInput = page.locator('#login-password');
    await expect(passwordInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test('4. Protected Routes - Authentication Redirect Guards', async ({ page }) => {
    // Attempt visiting protected coach dashboard without auth
    await page.goto('/coach/dashboard');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');

    // Attempt visiting protected parent dashboard without auth
    await page.goto('/parent/dashboard');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('5. Mobile Viewport Responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/coastal');

    // Verify main header and form are visible on mobile layout
    const sponsorshipBanner = page.locator('text=$1,000 Team Sponsorship');
    await expect(sponsorshipBanner).toBeVisible();
  });

});
