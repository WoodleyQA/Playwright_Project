import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';
import { Booking, CreateBookingResponse } from '../../api/types';

test.describe('Booking', () => {
  let client: ApiClient;
  let token: string;

  test.beforeEach(async ({ request }) => {
    client = new ApiClient(request);
    token = await client.createToken('admin', 'password123');
  });

  test('creates, reads, updates, and deletes a booking', async () => {
    const booking: Booking = {
      firstname: 'Jim',
      lastname: 'Brown',
      totalprice: 111,
      depositpaid: true,
      bookingdates: { checkin: '2026-09-01', checkout: '2026-09-05' },
      additionalneeds: 'Breakfast',
    };

    const createResponse = await client.createBooking(booking);
    expect(createResponse.ok()).toBeTruthy();
    const created: CreateBookingResponse = await createResponse.json();
    expect(created.booking).toMatchObject(booking);

    const getResponse = await client.getBooking(created.bookingid);
    expect(getResponse.ok()).toBeTruthy();
    await expect(getResponse.json()).resolves.toMatchObject(booking);

    const updatedBooking: Booking = { ...booking, totalprice: 222 };
    const updateResponse = await client.updateBooking(created.bookingid, updatedBooking, token);
    expect(updateResponse.ok()).toBeTruthy();
    await expect(updateResponse.json()).resolves.toMatchObject(updatedBooking);

    const deleteResponse = await client.deleteBooking(created.bookingid, token);
    expect(deleteResponse.status()).toBe(201);

    const getAfterDelete = await client.getBooking(created.bookingid);
    expect(getAfterDelete.status()).toBe(404);
  });

  test('lists booking ids and supports filtering by name', async () => {
    const response = await client.getBookingIds({ firstname: 'Jim', lastname: 'Brown' });

    expect(response.ok()).toBeTruthy();
    const ids = await response.json();
    expect(Array.isArray(ids)).toBeTruthy();
  });
});
