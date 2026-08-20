import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';
import { sampleBooking } from './testData';

test.describe('Booking authorization', () => {
  let client: ApiClient;
  let token: string;
  let bookingId: number;
  const booking = sampleBooking({ firstname: 'Auth', lastname: 'Guard' });

  test.beforeEach(async ({ request }) => {
    client = new ApiClient(request);
    token = await client.createToken('admin', 'password123');

    const createResponse = await client.createBooking(booking);
    ({ bookingid: bookingId } = await createResponse.json());
  });

  test.afterEach(async () => {
    await client.deleteBooking(bookingId, token);
  });

  test('PUT /booking/{id} rejects requests without a token', async () => {
    const response = await client.updateBooking(bookingId, { ...booking, totalprice: 999 });

    expect(response.status()).toBe(403);
  });

  test('PUT /booking/{id} rejects requests with an invalid token', async () => {
    const response = await client.updateBooking(bookingId, { ...booking, totalprice: 999 }, 'not-a-real-token');

    expect(response.status()).toBe(403);
  });

  test('DELETE /booking/{id} rejects requests without a token', async () => {
    const response = await client.deleteBooking(bookingId);

    expect(response.status()).toBe(403);
  });

  test('DELETE /booking/{id} rejects requests with an invalid token', async () => {
    const response = await client.deleteBooking(bookingId, 'not-a-real-token');

    expect(response.status()).toBe(403);
  });

  test('a booking survives a rejected unauthenticated update', async () => {
    await client.updateBooking(bookingId, { ...booking, totalprice: 999 });

    const getResponse = await client.getBooking(bookingId);
    await expect(getResponse.json()).resolves.toEqual(booking);
  });
});
