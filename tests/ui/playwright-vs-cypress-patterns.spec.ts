// Cypress's cy.get() retries too, but only implicitly: the retry loop is
// actually driven by the chained .should() assertion, not cy.get() itself.
// Playwright's expect(locator).toBeVisible() combines the query and the
// retrying assertion in one call - this test demonstrates that directly
// against an element that only exists after a real network round trip.

import { test, expect } from '@playwright/test';
import { ReservationPage } from '../../pages/ReservationPage';
import { generateBookingDates } from '../../utils/dateHelpers';

const DOUBLE_ROOM_ID = 2;

test.describe('Playwright auto-retrying locator pattern', () => {
  test('waits for a confirmation message that only appears after a network call resolves', async ({ page }) => {
    const { checkin, checkout } = generateBookingDates();
    const reservation = new ReservationPage(page);
    await reservation.open(DOUBLE_ROOM_ID, checkin, checkout);
    await reservation.startBooking();
    await reservation.fillGuestDetails({
      firstname: 'Playwright',
      lastname: 'AutoRetry',
      email: 'playwright.autoretry@example.com',
      phone: '01234567890',
    });

    await reservation.submit();

    // No manual wait or sleep: submitting triggers a POST /api/booking
    // call, and the confirmation heading doesn't exist in the DOM until
    // that resolves and React re-renders. This assertion polls the
    // locator on its own until the element appears (or the default
    // timeout elapses) - that polling is Playwright's auto-retry.
    await expect(reservation.confirmationHeading).toBeVisible();
  });
});
