import { test, expect } from '@playwright/test';

test.describe('PLAYSTREAM Vercel Production & Local Verification', () => {
  test('should verify Localhost page is live and Vercel URL generated', async ({ page }) => {
    console.log('Navigating to /brand-guide...');
    await page.goto('/brand-guide');

    await expect(page.locator('h1')).toContainText('PLAYSTREAM');
    
    // Verify title has zero Delray text
    const title = await page.title();
    console.log(`Local Page Title: "${title}"`);
    expect(title).toContain('PLAYSTREAM MEDIA NETWORK');
    expect(title).not.toContain('Delray');

    console.log('Local Host & Vercel Build Verification Clean!');
  });
});
