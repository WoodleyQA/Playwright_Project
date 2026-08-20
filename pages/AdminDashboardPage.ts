import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminDashboardPage extends BasePage {
  readonly roomNumberColumnHeader: Locator;
  readonly reportNavLink: Locator;

  constructor(page: Page) {
    super(page);
    this.roomNumberColumnHeader = page.getByText('Room #', { exact: true });
    this.reportNavLink = page.getByRole('link', { name: 'Report' });
  }
}
