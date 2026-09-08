import { expect, test } from './fixtures';
import { assertShape, BOOKING_FIELDS, BOOKING_ID_FIELDS, CREATE_BOOKING_RESPONSE_FIELDS } from './schema';

test.describe('Response schema', () => {
  test('POST /booking response matches the expected shape', async ({ createBooking }) => {
    const { response, body } = await createBooking({ firstname: 'Schema', lastname: 'Create' });

    expect(response.status()).toBe(200);
    assertShape(body, CREATE_BOOKING_RESPONSE_FIELDS);
  });

  test('GET /booking/{id} response matches the expected shape', async ({ createBooking, client }) => {
    const { body: created } = await createBooking({ firstname: 'Schema', lastname: 'Get' });

    const response = await client.getBooking(created.bookingid);

    expect(response.status()).toBe(200);
    const body = await response.json();
    assertShape(body, BOOKING_FIELDS);
  });

  test('GET /booking response matches the expected shape', async ({ createBooking, client }) => {
    const { body: created } = await createBooking({ firstname: 'SchemaListCheck', lastname: 'Get' });

    // Scope the list to the booking we just made rather than iterating the
    // full shared dataset (thousands of records from other test runs).
    const response = await client.getBookingIds({
      firstname: created.booking.firstname,
      lastname: created.booking.lastname,
    });

    expect(response.status()).toBe(200);
    const ids = await response.json();
    expect(Array.isArray(ids)).toBe(true);
    expect(ids.length).toBeGreaterThan(0);
    for (const entry of ids) {
      assertShape(entry, BOOKING_ID_FIELDS);
    }
    expect(ids.some((entry: { bookingid: number }) => entry.bookingid === created.bookingid)).toBe(true);
  });
});

test.describe('Data persistence', () => {
  test('a created booking is immediately retrievable with the same data', async ({ createBooking, client }) => {
    const { body: created } = await createBooking({ firstname: 'Persist', lastname: 'Create' });

    const getResponse = await client.getBooking(created.bookingid);
    expect(getResponse.status()).toBe(200);
    await expect(getResponse.json()).resolves.toEqual(created.booking);
  });

  test('an update actually persists, not just returns 200', async ({ createBooking, client, token }) => {
    const { body: created } = await createBooking({ firstname: 'Persist', lastname: 'Update' });

    const updatedBooking = {
      ...created.booking,
      totalprice: created.booking.totalprice + 77,
      additionalneeds: 'Late checkout',
    };
    const putResponse = await client.updateBooking(created.bookingid, updatedBooking, token);
    expect(putResponse.status()).toBe(200);

    const getResponse = await client.getBooking(created.bookingid);
    expect(getResponse.status()).toBe(200);
    await expect(getResponse.json()).resolves.toEqual(updatedBooking);
  });

  test('a delete actually removes the booking, not just returns success', async ({ createBooking, client, token }) => {
    const { body: created } = await createBooking({ firstname: 'Persist', lastname: 'Delete' });

    const deleteResponse = await client.deleteBooking(created.bookingid, token);
    expect(deleteResponse.status()).toBe(201);

    const getResponse = await client.getBooking(created.bookingid);
    expect(getResponse.status()).toBe(404);
  });
});
