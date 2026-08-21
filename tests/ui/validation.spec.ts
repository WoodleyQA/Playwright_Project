import { test, expect } from '@playwright/test';
import { ReservationPage } from '../../pages/ReservationPage';
import { AdminLoginPage } from '../../pages/AdminLoginPage';
import { AdminDashboardPage } from '../../pages/AdminDashboardPage';

const SINGLE_ROOM_ID = 1;
const SUITE_ROOM_ID = 3;

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Spread across a multi-year window, far wider than the couple of years
// this session's manual exploration already exercised on this shared
// public demo, so a genuinely successful booking (the phone-field test)
// doesn't collide with a pre-existing one and trigger the same 409/crash
// the invalid-date-range test deliberately exercises below.
function randomFutureDateRange(): { checkin: string; checkout: string } {
  const offsetDays = 1_000 + Math.floor(Math.random() * 4_000);
  const checkin = new Date(Date.now() + offsetDays * 86_400_000);
  const checkout = new Date(checkin.getTime() + 2 * 86_400_000);
  return { checkin: toISODate(checkin), checkout: toISODate(checkout) };
}

// Same window, but with checkout deliberately before checkin.
function randomInvertedDateRange(): { checkin: string; checkout: string } {
  const offsetDays = 1_000 + Math.floor(Math.random() * 4_000);
  const checkin = new Date(Date.now() + offsetDays * 86_400_000);
  const checkout = new Date(checkin.getTime() - 2 * 86_400_000);
  return { checkin: toISODate(checkin), checkout: toISODate(checkout) };
}

test.describe('Reservation form validation', () => {
  test('blocks submission when required guest fields are blank', async ({ page }) => {
    const { checkin, checkout } = randomFutureDateRange();
    const reservation = new ReservationPage(page);
    await reservation.open(SINGLE_ROOM_ID, checkin, checkout);
    await reservation.startBooking();

    await reservation.submit();

    await expect(reservation.validationErrors).toBeVisible();
    const messages = await reservation.validationErrorMessages();
    expect(messages.some((m) => m.toLowerCase().includes('firstname'))).toBe(true);
    expect(messages.some((m) => m.toLowerCase().includes('lastname'))).toBe(true);
    await expect(reservation.confirmationHeading).not.toBeVisible();
  });

  test('blocks submission when the email is not well-formed', async ({ page }) => {
    const { checkin, checkout } = randomFutureDateRange();
    const reservation = new ReservationPage(page);
    await reservation.open(SINGLE_ROOM_ID, checkin, checkout);
    await reservation.startBooking();

    await reservation.fillGuestDetails({
      firstname: 'Playwright',
      lastname: 'Tester',
      email: 'not-an-email',
      phone: '01234567890',
    });
    await reservation.submit();

    await expect(reservation.validationErrors).toBeVisible();
    const messages = await reservation.validationErrorMessages();
    expect(messages.some((m) => m.toLowerCase().includes('email'))).toBe(true);
    await expect(reservation.confirmationHeading).not.toBeVisible();
  });

  // Real-site finding: the phone field is only length-checked (11-21 chars)
  // server-side, not checked for actually being numeric. A letters-only
  // value of valid length sails through and the booking completes - this
  // documents that gap rather than asserting the (incorrect) ideal outcome.
  test('does not actually validate that the phone field is numeric', async ({ page }) => {
    const { checkin, checkout } = randomFutureDateRange();
    const reservation = new ReservationPage(page);
    await reservation.open(SINGLE_ROOM_ID, checkin, checkout);
    await reservation.startBooking();

    await reservation.fillGuestDetails({
      firstname: 'Playwright',
      lastname: 'Tester',
      email: 'playwright.tester@example.com',
      phone: 'NotANumberPhone1',
    });
    await reservation.submit();

    await expect(reservation.confirmationHeading).toBeVisible();
  });

  // Real-site finding: an inverted date range isn't validated client-side
  // (the price summary happily shows "x -2 nights") or rejected with a
  // friendly error. The backend responds 409, and the frontend doesn't
  // handle that response - it crashes into Next.js's generic error
  // boundary instead of showing a validation message. Documenting the
  // actual behavior rather than asserting the graceful outcome that would
  // be expected of a properly validated form.
  test('an invalid date range (checkout before checkin) breaks the booking flow instead of showing a validation error', async ({
    page,
  }) => {
    const { checkin, checkout } = randomInvertedDateRange();
    const reservation = new ReservationPage(page);
    await reservation.open(SUITE_ROOM_ID, checkin, checkout);
    await reservation.startBooking();

    await reservation.fillGuestDetails({
      firstname: 'Playwright',
      lastname: 'Tester',
      email: 'playwright.tester@example.com',
      phone: '01234567890',
    });
    await reservation.submit();

    await expect(reservation.confirmationHeading).not.toBeVisible();
    // Note: the DOM renders this heading with a typographic apostrophe
    // (’), not a straight one, hence the regex instead of a literal.
    await expect(page.getByRole('heading', { name: /This page couldn.t load/ })).toBeVisible();
  });
});

test.describe('Admin login validation', () => {
  test('shows an error and grants no access on wrong credentials', async ({ page }) => {
    const login = new AdminLoginPage(page);
    const dashboard = new AdminDashboardPage(page);
    await login.open();

    await login.login('admin', 'definitely-wrong-password');

    await expect(login.errorAlert).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(dashboard.roomNumberColumnHeader).not.toBeVisible();
  });
});
