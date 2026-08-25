import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { BOOKING_PLATFORM_URL } from './bookingPlatformConfig';

export class AdminLoginPage extends BasePage {
  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Login' });
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.errorAlert = page.getByText('Invalid credentials');
  }

  async open() {
    await this.goto(`${BOOKING_PLATFORM_URL}/admin`);
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.assertAndClick(this.loginButton, 10000);
  }
}
