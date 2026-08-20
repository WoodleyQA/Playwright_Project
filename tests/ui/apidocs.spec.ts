import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/HomePage';
import { ApiDocsPage } from '../../pages/ApiDocsPage';

test.describe('Restful-Booker API docs page', () => {
  // This page's content renders asynchronously via RequireJS against a
  // third-party host; under concurrent load the network-idle + render wait
  // in ApiDocsPage can run long, so give these tests more headroom than the
  // default 30s.
  test.describe.configure({ timeout: 60_000 });

  test('renders the project title and navigation', async ({ page }) => {
    const apiDocs = new ApiDocsPage(page);
    await apiDocs.open();

    await expect(apiDocs.projectTitle).toContainText('restful-booker', { ignoreCase: true });
    await expect(apiDocs.sidenav).toContainText('Auth');
  });

  test('lists the Auth and Booking sections', async ({ page }) => {
    const apiDocs = new ApiDocsPage(page);
    await apiDocs.open();

    await expect(apiDocs.navGroupLink('Auth')).toHaveCount(1);
    await expect(apiDocs.navGroupLink('Booking')).toHaveCount(1);
  });

  test('is reachable from the home page', async ({ page }) => {
    const home = new HomePage(page);
    const apiDocs = new ApiDocsPage(page);
    await home.open();

    await home.goToApiDocs();
    await expect(page).toHaveURL(/apidoc\/index\.html/);
    await apiDocs.waitUntilLoaded();

    await expect(apiDocs.projectTitle).toContainText('restful-booker', { ignoreCase: true });
  });
});
