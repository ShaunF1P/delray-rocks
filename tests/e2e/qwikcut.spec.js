import { test, expect } from '@playwright/test';

async function navigateWithAuth(page, targetUrl = '/coach/film') {
  await page.context().addCookies([
    {
      name: 'sb-access-token',
      value: 'mock-token',
      domain: 'localhost',
      path: '/',
    },
  ]);

  await page.goto(targetUrl);
  await page.waitForLoadState('domcontentloaded');

  if (page.url().includes('/login')) {
    const usernameInput = page.locator('#login-username');
    const passwordInput = page.locator('#login-password');
    const submitBtn = page.locator('button[type="submit"]');

    if (await usernameInput.isVisible()) {
      await usernameInput.fill('gerardm');
      await passwordInput.fill('Rocks2026!');
      await submitBtn.click();
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');
    }
  }
}

test.describe('QwikCut API Integration & Advanced Game Stats Suite', () => {

  test('Tier 1: QwikCut Sync Button & Stats Panel Rendering', async ({ page }) => {
    await navigateWithAuth(page, '/coach/film');

    // 1. Verify QwikCut Sync Header Button
    const syncBtn = page.locator('[data-testid="qwikcut-sync-btn"]');
    await expect(syncBtn).toBeVisible({ timeout: 10000 });
    await expect(syncBtn).toContainText('Sync QwikCut');

    // 2. Verify Advanced Game Stats Panel Rendering
    const statsPanel = page.locator('[data-testid="qwikcut-stats-panel"]');
    await expect(statsPanel).toBeVisible({ timeout: 10000 });
    await expect(statsPanel).toContainText('Advanced Game Stats & Telemetry');
    await expect(statsPanel).toContainText('Total Offensive Yards');
    await expect(statsPanel).toContainText('Yards Per Play (YPP)');
    await expect(statsPanel).toContainText('Offensive Success Rate');
  });

  test('Tier 2: QwikCut Cloud Library Sync Modal & Import Flow', async ({ page }) => {
    await navigateWithAuth(page, '/coach/film');

    // Open QwikCut Modal
    const syncBtn = page.locator('[data-testid="qwikcut-sync-btn"]');
    await syncBtn.click();

    // Verify Modal Title & Content
    const modalHeading = page.locator('h3:has-text("QwikCut Video Library & Cloud Ingestion")');
    await expect(modalHeading).toBeVisible({ timeout: 5000 });

    // Verify Import Button for video
    const importBtn = page.locator('[data-testid^="import-qwikcut-"]').first();
    await expect(importBtn).toBeVisible();

    // Click Import
    await importBtn.click();

    // Verify toast or modal close
    await expect(modalHeading).not.toBeVisible({ timeout: 5000 });
  });

  test('Tier 3: QwikCut Sync API & Stats Endpoint Contract', async ({ request }) => {
    // Test GET /api/qwikcut/sync
    const syncRes = await request.get('/api/qwikcut/sync');
    expect(syncRes.status()).toBe(200);
    const syncData = await syncRes.json();
    expect(syncData.success).toBe(true);
    expect(syncData.totalFilms).toBeGreaterThan(0);

    // Test GET /api/qwikcut/stats
    const statsRes = await request.get('/api/qwikcut/stats?filmId=qwik_film_8u_001');
    expect(statsRes.status()).toBe(200);
    const statsData = await statsRes.json();
    expect(statsData.success).toBe(true);
    expect(statsData.stats.summary.totalYards).toBeGreaterThan(0);
    expect(statsData.stats.summary.yardsPerPlay).toBeGreaterThan(0);
  });
});
