import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';
import { sampleBooking } from './testData';
import { assertShape, BOOKING_FIELDS, BOOKING_ID_FIELDS, CREATE_BOOKING_RESPONSE_FIELDS } from './schema';

test.describe('Response schema', () => {
  let client: ApiClient;
  let token: string;

  test.beforeEach(async ({ request }) => {
    client = new ApiClient(request);
    token = await client.createToken('admin', 'password123');
  });

  test('POST /booking response matches the expected shape', async () => {
    const response = await client.createBooking(sampleBooking({ firstname: 'Schema', lastname: 'Create' }));

    expect(response.status()).toBe(200);
    const body = await response.json();
    assertShape(body, CREATE_BOOKING_RESPONSE_FIELDS);

    await client.deleteBooking(body.bookingid, token);
  });

  test('GET /booking/{id} response matches the expected shape', async () => {
    const createResponse = await client.createBooking(sampleBooking({ firstname: 'Schema', lastname: 'Get' }));
    const { bookingid } = await createResponse.json();

    const response = await client.getBooking(bookingid);

    expect(response.status()).toBe(200);
    const body = await response.json();
    assertShape(body, BOOKING_FIELDS);

    await client.deleteBooking(bookingid, token);
  });

  test('GET /booking response matches the expected shape', async () => {
    const booking = sampleBooking({ firstname: 'SchemaListCheck', lastname: 'Get' });
    const createResponse = await client.createBooking(booking);
    const { bookingid } = await createResponse.json();

    // Scope the list to the booking we just made rather than iterating the
    // full shared dataset (thousands of records from other test runs).
    const response = await client.getBookingIds({ firstname: booking.firstname, lastname: booking.lastname });

    expect(response.status()).toBe(200);
    const ids = await response.json();
    expect(Array.isArray(ids)).toBe(true);
    expect(ids.length).toBeGreaterThan(0);
    for (const entry of ids) {
      assertShape(entry, BOOKING_ID_FIELDS);
    }
    expect(ids.some((entry: { bookingid: number }) => entry.bookingid === bookingid)).toBe(true);

    await client.deleteBooking(bookingid, token);
  });
});

test.describe('Data persistence', () => {
  let client: ApiClient;
  let token: string;

  test.beforeEach(async ({ request }) => {
    client = new ApiClient(request);
    token = await client.createToken('admin', 'password123');
  });

  test('a created booking is immediately retrievable with the same data', async () => {
    const booking = sampleBooking({ firstname: 'Persist', lastname: 'Create' });

    const createResponse = await client.createBooking(booking);
    const { bookingid } = await createResponse.json();

    const getResponse = await client.getBooking(bookingid);
    expect(getResponse.status()).toBe(200);
    await expect(getResponse.json()).resolves.toEqual(booking);

    await client.deleteBooking(bookingid, token);
  });

  test('an update actually persists, not just returns 200', async () => {
    const booking = sampleBooking({ firstname: 'Persist', lastname: 'Update' });
    const createResponse = await client.createBooking(booking);
    const { bookingid } = await createResponse.json();

    const updatedBooking = {
      ...booking,
      totalprice: booking.totalprice + 77,
      additionalneeds: 'Late checkout',
    };
    const putResponse = await client.updateBooking(bookingid, updatedBooking, token);
    expect(putResponse.status()).toBe(200);

    const getResponse = await client.getBooking(bookingid);
    expect(getResponse.status()).toBe(200);
    await expect(getResponse.json()).resolves.toEqual(updatedBooking);

    await client.deleteBooking(bookingid, token);
  });

  test('a delete actually removes the booking, not just returns success', async () => {
    const booking = sampleBooking({ firstname: 'Persist', lastname: 'Delete' });
    const createResponse = await client.createBooking(booking);
    const { bookingid } = await createResponse.json();

    const deleteResponse = await client.deleteBooking(bookingid, token);
    expect(deleteResponse.status()).toBe(201);

    const getResponse = await client.getBooking(bookingid);
    expect(getResponse.status()).toBe(404);
  });
});
