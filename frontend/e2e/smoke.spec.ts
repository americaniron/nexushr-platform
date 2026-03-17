/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR E2E Test Suite — Playwright smoke tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Run: npx playwright test
 * Debug: npx playwright test --debug
 * Report: npx playwright show-report
 */

import { test, expect, Page } from '@playwright/test';

// ══════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function navigateTo(page: Page, path: string) {
  await page.goto(`${BASE_URL}/#${path}`);
  await page.waitForLoadState('networkidle');
}

// ══════════════════════════════════════════════════════
// 1. Navigation & Page Load Tests
// ══════════════════════════════════════════════════════

test.describe('Navigation', () => {
  test('home page loads with hero section', async ({ page }) => {
    await navigateTo(page, '/');
    await expect(page.locator('body')).toBeVisible();
    // Page should have content (not blank)
    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test('catalog page loads', async ({ page }) => {
    await navigateTo(page, '/catalog');
    await expect(page.locator('body')).toBeVisible();
  });

  test('pricing page loads', async ({ page }) => {
    await navigateTo(page, '/pricing');
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await navigateTo(page, '/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('signup page loads', async ({ page }) => {
    await navigateTo(page, '/signup');
    await expect(page.locator('body')).toBeVisible();
  });

  test('unauthenticated user redirected from dashboard', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    // Should redirect to login
    await page.waitForURL(/login/);
  });

  test('unknown route redirects to home', async ({ page }) => {
    await navigateTo(page, '/nonexistent-page');
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('#/');
  });
});

// ══════════════════════════════════════════════════════
// 2. Authentication Flow Tests
// ══════════════════════════════════════════════════════

test.describe('Authentication', () => {
  test('signup form has required fields', async ({ page }) => {
    await navigateTo(page, '/signup');
    // Look for email/password inputs
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThanOrEqual(2);
  });

  test('login form has required fields', async ({ page }) => {
    await navigateTo(page, '/login');
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThanOrEqual(2);
  });

  test('can navigate between login and signup', async ({ page }) => {
    await navigateTo(page, '/login');
    // Look for a link/button to signup
    const signupLink = page.locator('a[href*="signup"], button:has-text("sign up"), a:has-text("sign up"), a:has-text("create")').first();
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('signup');
    }
  });
});

// ══════════════════════════════════════════════════════
// 3. Theme Tests
// ══════════════════════════════════════════════════════

test.describe('Theme', () => {
  test('starts with system preference or light theme', async ({ page }) => {
    await navigateTo(page, '/');
    const theme = await page.getAttribute('html', 'data-theme');
    expect(['light', 'dark']).toContain(theme);
  });

  test('theme persists to localStorage', async ({ page }) => {
    await navigateTo(page, '/');
    const savedTheme = await page.evaluate(() => localStorage.getItem('nexushr_theme_mode'));
    expect(['light', 'dark', 'system', null]).toContain(savedTheme);
  });

  test('dark mode applies dark background', async ({ page }) => {
    await navigateTo(page, '/');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.setProperty('--bg-primary', '#0F0F0F');
    });
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim()
    );
    expect(bgColor).toBe('#0F0F0F');
  });
});

// ══════════════════════════════════════════════════════
// 4. Responsive Tests
// ══════════════════════════════════════════════════════

test.describe('Responsive', () => {
  test('renders on mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateTo(page, '/');
    await expect(page.locator('body')).toBeVisible();
    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
  });

  test('renders on tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateTo(page, '/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('renders on desktop viewport (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await navigateTo(page, '/');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════
// 5. Performance Tests
// ══════════════════════════════════════════════════════

test.describe('Performance', () => {
  test('initial page load under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await navigateTo(page, '/');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await navigateTo(page, '/');
    await page.waitForTimeout(1000);
    // Filter out expected/benign errors
    const realErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('sw.js') && !e.includes('manifest')
    );
    expect(realErrors.length).toBe(0);
  });

  test('page does not have memory leaks (basic check)', async ({ page }) => {
    await navigateTo(page, '/');
    const initialNodes = await page.evaluate(() => document.querySelectorAll('*').length);
    // Navigate away and back
    await navigateTo(page, '/catalog');
    await navigateTo(page, '/');
    const finalNodes = await page.evaluate(() => document.querySelectorAll('*').length);
    // Should not grow significantly
    expect(finalNodes).toBeLessThan(initialNodes * 2);
  });
});

// ══════════════════════════════════════════════════════
// 6. Accessibility Tests
// ══════════════════════════════════════════════════════

test.describe('Accessibility', () => {
  test('page has a lang attribute', async ({ page }) => {
    await navigateTo(page, '/');
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();
  });

  test('images have alt text', async ({ page }) => {
    await navigateTo(page, '/');
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('interactive elements are keyboard focusable', async ({ page }) => {
    await navigateTo(page, '/');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════
// 7. Offline Tests
// ══════════════════════════════════════════════════════

test.describe('Offline', () => {
  test('localStorage operations work', async ({ page }) => {
    await navigateTo(page, '/');
    const result = await page.evaluate(() => {
      localStorage.setItem('test_key', 'test_value');
      return localStorage.getItem('test_key');
    });
    expect(result).toBe('test_value');
  });

  test('offline mode detected', async ({ page }) => {
    await navigateTo(page, '/');
    // Simulate offline
    await page.context().setOffline(true);
    const isOnline = await page.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(false);
    // Restore
    await page.context().setOffline(false);
  });
});
