import { expect, test } from './fixtures';
import { Booking, BookingId } from '../../api/types';
import { sampleBooking } from './testData';

test.describe('Booking API', () => {
  test.describe('POST /booking', () => {
    test('creates a booking and returns the generated id and booking payload', async ({ createBooking }) => {
      const booking = sampleBooking();

      const { response, body } = await createBooking();

      expect(response.status()).toBe(200);
      expect(typeof body.bookingid).toBe('number');
      expect(body.booking).toEqual(booking);
    });
  });

  test.describe('GET /booking', () => {
    test('lists booking ids as an array of { bookingid }', async ({ createBooking, client }) => {
      const { body: created } = await createBooking({ firstname: 'Filtered', lastname: 'Person' });

      const response = await client.getBookingIds();

      expect(response.status()).toBe(200);
      const ids: BookingId[] = await response.json();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.every((entry) => typeof entry.bookingid === 'number')).toBe(true);
      expect(ids.some((entry) => entry.bookingid === created.bookingid)).toBe(true);
    });

    test('filters booking ids by query params', async ({ createBooking, client }) => {
      const { body: created } = await createBooking({ firstname: 'Filtered', lastname: 'Person' });

      const response = await client.getBookingIds({
        firstname: created.booking.firstname,
        lastname: created.booking.lastname,
      });

      expect(response.status()).toBe(200);
      const ids: BookingId[] = await response.json();
      expect(ids.some((entry) => entry.bookingid === created.bookingid)).toBe(true);
    });

    test('returns no ids for a filter that matches nothing', async ({ client }) => {
      const response = await client.getBookingIds({ firstname: 'NoSuchFirstName-xyz' });

      expect(response.status()).toBe(200);
      const ids: BookingId[] = await response.json();
      expect(ids.length).toBe(0);
    });
  });

  test.describe('GET /booking/{id}', () => {
    test('returns the full booking payload for a valid id', async ({ createBooking, client }) => {
      const { body: created } = await createBooking();

      const response = await client.getBooking(created.bookingid);

      expect(response.status()).toBe(200);
      await expect(response.json()).resolves.toEqual(created.booking);
    });

    test('returns 404 for a nonexistent id', async ({ client }) => {
      const response = await client.getBooking(999999999);

      expect(response.status()).toBe(404);
    });
  });

  test.describe('PUT /booking/{id}', () => {
    test('updates the booking when authenticated', async ({ createBooking, client, token }) => {
      const { body: created } = await createBooking();
      const updatedBooking: Booking = {
        ...created.booking,
        totalprice: created.booking.totalprice + 50,
        additionalneeds: 'Late checkout',
      };

      const response = await client.updateBooking(created.bookingid, updatedBooking, token);

      expect(response.status()).toBe(200);
      await expect(response.json()).resolves.toEqual(updatedBooking);

      const getResponse = await client.getBooking(created.bookingid);
      await expect(getResponse.json()).resolves.toEqual(updatedBooking);
    });
  });

  test.describe('DELETE /booking/{id}', () => {
    test('deletes the booking when authenticated, and it becomes unretrievable', async ({
      createBooking,
      client,
      token,
    }) => {
      const { body: created } = await createBooking();

      const deleteResponse = await client.deleteBooking(created.bookingid, token);
      expect(deleteResponse.status()).toBe(201);

      const getResponse = await client.getBooking(created.bookingid);
      expect(getResponse.status()).toBe(404);
    });
  });
});
