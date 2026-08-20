import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { BOOKING_PLATFORM_URL } from './bookingPlatformConfig';

export interface GuestDetails {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
}

export class ReservationPage extends BasePage {
  readonly roomHeading: Locator;
  readonly reserveNowButton: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly confirmationHeading: Locator;
  readonly confirmationDates: Locator;

  constructor(page: Page) {
    super(page);
    this.roomHeading = page.getByRole('heading', { level: 1 });
    this.reserveNowButton = page.getByRole('button', { name: 'Reserve Now' });
    this.firstNameInput = page.getByRole('textbox', { name: 'Firstname' });
    this.lastNameInput = page.getByRole('textbox', { name: 'Lastname' });
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.phoneInput = page.getByRole('textbox', { name: 'Phone' });
    this.confirmationHeading = page.getByRole('heading', { name: 'Booking Confirmed' });
    this.confirmationDates = page.getByText(/^\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}$/);
  }

  async open(roomId: number, checkin: string, checkout: string) {
    await this.goto(`${BOOKING_PLATFORM_URL}/reservation/${roomId}?checkin=${checkin}&checkout=${checkout}`);
  }

  async startBooking() {
    await this.reserveNowButton.click();
  }

  async fillGuestDetails(details: GuestDetails) {
    await this.firstNameInput.fill(details.firstname);
    await this.lastNameInput.fill(details.lastname);
    await this.emailInput.fill(details.email);
    await this.phoneInput.fill(details.phone);
  }

  async submit() {
    await this.reserveNowButton.click();
  }
}
