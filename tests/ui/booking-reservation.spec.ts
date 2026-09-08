import { test, expect } from '@playwright/test';
import { ReservationPage } from '../../pages/ReservationPage';
import { generateBookingDates } from '../../utils/dateHelpers';

const DOUBLE_ROOM_ID = 2;

test.describe('Reservation form', () => {
  test('submits a booking request and shows a confirmation', async ({ page }) => {
    const { checkin, checkout } = generateBookingDates();
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
