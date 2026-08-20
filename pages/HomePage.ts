import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly heading: Locator;
  readonly apiDocsLink: Locator;
  readonly codeLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Welcome to Restful-Booker' });
    this.apiDocsLink = page.getByRole('link', { name: 'API Docs' });
    this.codeLink = page.getByRole('link', { name: 'Code' });
  }

  async open() {
    await this.goto('/');
  }

  async goToApiDocs() {
    await this.apiDocsLink.click();
  }
}
