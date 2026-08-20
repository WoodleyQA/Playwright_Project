import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../../pages/AdminLoginPage';
import { AdminDashboardPage } from '../../pages/AdminDashboardPage';

test.describe('Admin login', () => {
  test('logs in with valid credentials and reaches the admin dashboard', async ({ page }) => {
    const login = new AdminLoginPage(page);
    const dashboard = new AdminDashboardPage(page);
    await login.open();

    await login.login('admin', 'password');

    await expect(page).toHaveURL(/\/admin\/rooms/);
    await expect(dashboard.roomNumberColumnHeader).toBeVisible();
  });

  test('shows an error for invalid credentials and stays on the login page', async ({ page }) => {
    const login = new AdminLoginPage(page);
    await login.open();

    await login.login('admin', 'wrong-password');

    await expect(login.errorAlert).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
  });
});
