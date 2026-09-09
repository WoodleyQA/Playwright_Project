import { expect, test } from './fixtures';
import { ApiClient } from '../../api/ApiClient';
import { sampleBooking } from './testData';

test.describe('POST /auth - negative cases', () => {
  // restful-booker's /auth endpoint always responds 200, even for bad or
  // missing credentials - there is no 4xx here. The actual failure signal
  // is a { reason: 'Bad credentials' } body with no token, so that's what
  // these assert instead of a status code that the live API never sends.
  test('an invalid username returns no token', async ({ request }) => {
    const client = new ApiClient(request);

    const response = await client.authenticate('not-a-real-user', 'password123');
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.token).toBeUndefined();
    expect(body.reason).toBe('Bad credentials');
  });

  test('an invalid password returns no token', async ({ request }) => {
    const client = new ApiClient(request);

    const response = await client.authenticate('admin', 'not-the-real-password');
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.token).toBeUndefined();
    expect(body.reason).toBe('Bad credentials');
  });

  test('missing credentials return no token', async ({ request }) => {
    const client = new ApiClient(request);

    const response = await client.authenticateRaw({});
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.token).toBeUndefined();
    expect(body.reason).toBe('Bad credentials');
  });
});

test.describe('POST /booking - edge cases', () => {
  test('missing required fields fails server-side rather than validating', async ({ client }) => {
    const response = await client.createBookingRaw({});

    // The API has no request validation for this endpoint - an empty
    // payload isn't rejected with a 4xx, it crashes the handler.
    expect(response.status()).toBe(500);
  });

  test('an invalid type for a numeric field is silently coerced, not rejected', async ({ client, token }) => {
    const payload = { ...sampleBooking(), totalprice: 'not-a-number' };

    const response = await client.createBookingRaw(payload);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.booking.totalprice).toBeNull();

    await client.deleteBooking(body.bookingid, token);
  });

  test('an invalid date range (checkout before checkin) is accepted without validation', async ({ createBooking }) => {
    const overrides = { bookingdates: { checkin: '2027-01-10', checkout: '2027-01-01' } };

    const { response, body } = await createBooking(overrides);

    expect(response.status()).toBe(200);
    expect(body.booking).toEqual(sampleBooking(overrides));
  });
});

test.describe('Booking mutation without a token', () => {
  test('PUT /booking/{id} without a token is rejected, not applied', async ({ createBooking, client }) => {
    const { body: created } = await createBooking({ firstname: 'Negative', lastname: 'Case' });

    const response = await client.updateBooking(created.bookingid, sampleBooking({ totalprice: 999 }));

    expect(response.status()).toBe(403);
    expect(response.status()).not.toBe(200);
  });

  test('DELETE /booking/{id} without a token is rejected, not applied', async ({ createBooking, client }) => {
    const { body: created } = await createBooking({ firstname: 'Negative', lastname: 'Case' });

    const response = await client.deleteBooking(created.bookingid);

    expect(response.status()).toBe(403);
    expect(response.status()).not.toBe(200);

    const getResponse = await client.getBooking(created.bookingid);
    expect(getResponse.status()).toBe(200);
  });
});

test.describe('GET /booking/{id} - edge cases', () => {
  test('returns 404 for a booking id that does not exist', async ({ client }) => {
    const response = await client.getBooking(999999999);

    expect(response.status()).toBe(404);
  });
});
