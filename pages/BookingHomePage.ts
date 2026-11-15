import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { BOOKING_PLATFORM_URL } from './bookingPlatformConfig';

export class BookingHomePage extends BasePage {
  readonly heading: Locator;
  readonly bookingWidget: Locator;
  readonly checkInInput: Locator;
  readonly checkOutInput: Locator;
  readonly checkAvailabilityButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Welcome to Shady Meadows B&B' });
    this.bookingWidget = page.locator('.booking-card');
    // The widget's "Check In" / "Check Out" labels are not associated with
    // their inputs (each textbox's accessible name is its current date value),
    // so getByLabel is not available. The widget contains exactly these two
    // textboxes, in order.
    const dateInputs = this.bookingWidget.getByRole('textbox');
    this.checkInInput = dateInputs.first();
    this.checkOutInput = dateInputs.last();
    this.checkAvailabilityButton = this.bookingWidget.getByRole('button', { name: 'Check Availability' });
  }

  async open() {
    await this.goto(`${BOOKING_PLATFORM_URL}/`);
  }

  roomCard(roomName: string): Locator {
    return this.page
      .locator('.room-card')
      .filter({ has: this.page.getByRole('heading', { name: roomName, level: 5, exact: true }) });
  }

  bookNowLink(roomName: string): Locator {
    return this.roomCard(roomName).getByRole('link', { name: 'Book now' });
  }
}
