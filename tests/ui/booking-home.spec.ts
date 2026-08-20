import { test, expect } from '@playwright/test';
import { BookingHomePage } from '../../pages/BookingHomePage';
import { ReservationPage } from '../../pages/ReservationPage';

const ROOMS = [
  { name: 'Single', price: '£100' },
  { name: 'Double', price: '£150' },
  { name: 'Suite', price: '£225' },
];

test.describe('Shady Meadows B&B homepage', () => {
  test('displays room listings with pricing and default booking dates', async ({ page }) => {
    const home = new BookingHomePage(page);
    await home.open();

    await expect(home.heading).toBeVisible();
    await expect(home.checkInInput).not.toHaveValue('');
    await expect(home.checkOutInput).not.toHaveValue('');

    for (const room of ROOMS) {
      await expect(home.roomCard(room.name)).toContainText(room.price);
      await expect(home.bookNowLink(room.name)).toBeVisible();
    }
  });

  test('checking availability re-renders the room listings without error', async ({ page }) => {
    const home = new BookingHomePage(page);
    await home.open();

    await home.checkAvailabilityButton.click();

    // Room availability for the default dates depends on shared, live demo
    // data, so assert the listing section still renders rather than which
    // specific rooms remain.
    await expect(page.getByRole('heading', { name: 'Our Rooms' })).toBeVisible();
    await expect(page.getByRole('heading', { name: "This page couldn't load" })).toHaveCount(0);
  });

  test('navigates from a room listing to its reservation page', async ({ page }) => {
    const home = new BookingHomePage(page);
    const reservation = new ReservationPage(page);
    await home.open();

    await home.bookNowLink('Single').click();

    await expect(page).toHaveURL(/\/reservation\/1/);
    await expect(reservation.roomHeading).toHaveText('Single Room');
  });
});
