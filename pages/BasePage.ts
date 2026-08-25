import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  async assertAndClick(locator: Locator, timeout?: number) {
    await expect(locator).toBeEnabled({ timeout: timeout ?? 5000 });
    await locator.click();
  }
}
