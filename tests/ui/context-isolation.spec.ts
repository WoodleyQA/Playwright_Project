// Playwright isolates each test in its own BrowserContext (separate
// cookies, localStorage, and cache), not a shared browser profile - so
// these two tests can log into the same admin session concurrently with
// zero leakage, and scaling CI workers here is a config number instead of
// the extra tooling or careful sequencing Cypress's single-tab-per-run
// model often needs to parallelize safely.

import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../../pages/AdminLoginPage';
import { AdminDashboardPage } from '../../pages/AdminDashboardPage';

test.describe.configure({ mode: 'parallel' });

test.describe('Browser context isolation', () => {
  test('context A: starts pristine, logs in, and keeps its own marker', async ({ page, context }) => {
    const login = new AdminLoginPage(page);
    const dashboard = new AdminDashboardPage(page);

    const cookiesBeforeLogin = await context.cookies();
    expect(cookiesBeforeLogin.find((cookie) => cookie.name === 'token')).toBeUndefined();

    await login.open();
    await login.login('admin', 'password');

    await expect(page).toHaveURL(/\/admin\/rooms/);
    await expect(dashboard.roomNumberColumnHeader).toBeVisible();

    const cookiesAfterLogin = await context.cookies();
    expect(cookiesAfterLogin.find((cookie) => cookie.name === 'token')).toBeDefined();

    await page.evaluate(() => localStorage.setItem('isolation-marker', 'context-a'));
    const marker = await page.evaluate(() => localStorage.getItem('isolation-marker'));
    expect(marker).toBe('context-a');
  });

  test('context B: starts pristine, logs in, and keeps its own marker', async ({ page, context }) => {
    const login = new AdminLoginPage(page);
    const dashboard = new AdminDashboardPage(page);

    const cookiesBeforeLogin = await context.cookies();
    expect(cookiesBeforeLogin.find((cookie) => cookie.name === 'token')).toBeUndefined();

    await login.open();
    await login.login('admin', 'password');

    await expect(page).toHaveURL(/\/admin\/rooms/);
    await expect(dashboard.roomNumberColumnHeader).toBeVisible();

    const cookiesAfterLogin = await context.cookies();
    expect(cookiesAfterLogin.find((cookie) => cookie.name === 'token')).toBeDefined();

    await page.evaluate(() => localStorage.setItem('isolation-marker', 'context-b'));
    const marker = await page.evaluate(() => localStorage.getItem('isolation-marker'));
    expect(marker).toBe('context-b');
  });
});
