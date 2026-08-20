import { test, expect } from '@playwright/test';
import { ReservationPage } from '../../pages/ReservationPage';

const DOUBLE_ROOM_ID = 2;

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Spread the stay far into the future across a wide window so concurrent runs
// against this shared public demo don't collide on the same room/date pair.
function randomFutureDateRange(): { checkin: string; checkout: string } {
  const offsetDays = 90 + Math.floor(Math.random() * 600);
  const checkin = new Date(Date.now() + offsetDays * 86_400_000);
  const checkout = new Date(checkin.getTime() + 2 * 86_400_000);
  return { checkin: toISODate(checkin), checkout: toISODate(checkout) };
}

test.describe('Reservation form', () => {
  test('submits a booking request and shows a confirmation', async ({ page }) => {
    const { checkin, checkout } = randomFutureDateRange();
    const reservation = new ReservationPage(page);
    await reservation.open(DOUBLE_ROOM_ID, checkin, checkout);

    await expect(reservation.roomHeading).toHaveText('Double Room');

    await reservation.startBooking();
    await expect(reservation.firstNameInput).toBeVisible();

    await reservation.fillGuestDetails({
      firstname: 'Playwright',
      lastname: 'Tester',
      email: 'playwright.tester@example.com',
      phone: '01234567890',
    });
    await reservation.submit();

    await expect(reservation.confirmationHeading).toBeVisible();
    await expect(reservation.confirmationDates).toHaveText(`${checkin} - ${checkout}`);
  });
});
