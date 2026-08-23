// page.route() intercepts at the browser-engine level (via CDP) before a
// request is ever dispatched, rather than through an in-page proxy or
// service worker running inside the app. That's why it works uniformly
// for cross-origin requests and across multiple tabs/pages, a case where
// Cypress's in-browser interception model can run into trouble.

import { test, expect } from '@playwright/test';
import { ReservationPage } from '../../pages/ReservationPage';

const SINGLE_ROOM_ID = 1;

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Wide window so this doesn't collide with bookings from other tests or
// other traffic on this shared public demo.
function randomFutureDateRange(): { checkin: string; checkout: string } {
  const offsetDays = 1_000 + Math.floor(Math.random() * 4_000);
  const checkin = new Date(Date.now() + offsetDays * 86_400_000);
  const checkout = new Date(checkin.getTime() + 2 * 86_400_000);
  return { checkin: toISODate(checkin), checkout: toISODate(checkout) };
}

test.describe('Network interception', () => {
  test('a failed booking request fails silently, with no visible error state', async ({ page }) => {
    await page.route('**/api/booking', (route) => {
      if (route.request().method() === 'POST') {
        return route.abort('failed');
      }
      return route.continue();
    });

    const { checkin, checkout } = randomFutureDateRange();
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
