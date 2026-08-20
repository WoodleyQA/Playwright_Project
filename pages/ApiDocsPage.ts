import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ApiDocsPage extends BasePage {
  readonly projectTitle: Locator;
  readonly sidenav: Locator;

  constructor(page: Page) {
    super(page);
    this.projectTitle = page.locator('#project h1');
    this.sidenav = page.locator('#sidenav');
  }

  async open() {
    await this.goto('/apidoc/index.html');
  }

  navGroupLink(groupName: string): Locator {
    return this.sidenav.getByRole('link', { name: groupName, exact: true });
  }
}
