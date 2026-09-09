import { expect, test } from './fixtures';

test.describe('Booking authorization', () => {
  test('PUT /booking/{id} rejects requests without a token', async ({ createBooking, client }) => {
    const { body: created } = await createBooking({ firstname: 'Auth', lastname: 'Guard' });

    const response = await client.updateBooking(created.bookingid, { ...created.booking, totalprice: 999 });

    expect(response.status()).toBe(403);
  });

  test('PUT /booking/{id} rejects requests with an invalid token', async ({ createBooking, client }) => {
    const { body: created } = await createBooking({ firstname: 'Auth', lastname: 'Guard' });

    const response = await client.updateBooking(
      created.bookingid,
      { ...created.booking, totalprice: 999 },
      'not-a-real-token',
    );

    expect(response.status()).toBe(403);
  });

  test('DELETE /booking/{id} rejects requests without a token', async ({ createBooking, client }) => {
    const { body: created } = await createBooking({ firstname: 'Auth', lastname: 'Guard' });

    const response = await client.deleteBooking(created.bookingid);

    expect(response.status()).toBe(403);
  });

  test('DELETE /booking/{id} rejects requests with an invalid token', async ({ createBooking, client }) => {
    const { body: created } = await createBooking({ firstname: 'Auth', lastname: 'Guard' });

    const response = await client.deleteBooking(created.bookingid, 'not-a-real-token');

    expect(response.status()).toBe(403);
  });

  test('a booking survives a rejected unauthenticated update', async ({ createBooking, client }) => {
    const { body: created } = await createBooking({ firstname: 'Auth', lastname: 'Guard' });

    await client.updateBooking(created.bookingid, { ...created.booking, totalprice: 999 });

    const getResponse = await client.getBooking(created.bookingid);
    await expect(getResponse.json()).resolves.toEqual(created.booking);
  });
});
