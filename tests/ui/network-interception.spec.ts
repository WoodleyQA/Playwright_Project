// page.route() intercepts at the browser-engine level (via CDP) before a
// request is ever dispatched, rather than through an in-page proxy or
// service worker running inside the app. That's why it works uniformly
// for cross-origin requests and across multiple tabs/pages, a case where
// Cypress's in-browser interception model can run into trouble.

import { test, expect } from '@playwright/test';
import { ReservationPage } from '../../pages/ReservationPage';
import { generateBookingDates } from '../../utils/dateHelpers';

const SINGLE_ROOM_ID = 1;

test.describe('Network interception', () => {
  test('a failed booking request fails silently, with no visible error state', async ({ page }) => {
    await page.route('**/api/booking', (route) => {
      if (route.request().method() === 'POST') {
        return route.abort('failed');
      }
      return route.continue();
    });

    const { checkin, checkout } = generateBookingDates();
    const reservation = new ReservationPage(page);
    await reservation.open(SINGLE_ROOM_ID, checkin, checkout);
    await reservation.startBooking();
    await reservation.fillGuestDetails({
      firstname: 'Playwright',
      lastname: 'NetworkFailure',
      email: 'playwright.networkfailure@example.com',
      phone: '01234567890',
    });

    await reservation.submit();

    // Real-site finding: a failed request here isn't surfaced to the user
    // at all. The app catches the fetch rejection internally (visible only
    // as a console error, which a user never sees), then just resets to
    // the same form with the fields still filled in - no confirmation, no
    // validation-style alert, no crash. Documenting the actual (silent)
    // outcome rather than asserting the error state a well-behaved app
    // would show here.
    await expect(reservation.confirmationHeading).not.toBeVisible();
    await expect(reservation.validationErrors).not.toBeVisible();
    await expect(reservation.reserveNowButton).toBeVisible();
    await expect(reservation.reserveNowButton).toBeEnabled();
    await expect(reservation.firstNameInput).toHaveValue('Playwright');
  });
});
