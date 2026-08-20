import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/HomePage';

test.describe('Restful-Booker home page', () => {
  test('displays the welcome heading', async ({ page }) => {
    const home = new HomePage(page);
    await home.open();

    await expect(page).toHaveTitle('Welcome to Restful-Booker');
    await expect(home.heading).toBeVisible();
  });

  test('links to the API documentation', async ({ page }) => {
    const home = new HomePage(page);
    await home.open();

    await expect(home.apiDocsLink).toHaveAttribute('href', '/apidoc/index.html');
  });
});
