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
    await this.waitUntilLoaded();
  }

  // The page renders its content client-side via RequireJS (fetches
  // main.js, api data, and Handlebars templates, then populates
  // #project/#sidenav). The 'load' event fires well before that
  // finishes, so wait for the network to settle and for the rendered
  // content itself before the caller starts asserting against it.
  // Callers that arrive here via in-app navigation (rather than open())
  // must call this too, since only a fresh page.goto() waits on 'load'.
  async waitUntilLoaded() {
    await this.page.waitForLoadState('networkidle');
    await this.projectTitle.waitFor({ state: 'visible' });
    await this.sidenav.getByRole('link').first().waitFor({ state: 'visible' });
  }

  navGroupLink(groupName: string): Locator {
    return this.sidenav.getByRole('link', { name: groupName, exact: true });
  }
}
