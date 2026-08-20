import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';
import { Booking, BookingId, CreateBookingResponse } from '../../api/types';
import { sampleBooking } from './testData';

test.describe('Booking API', () => {
  let client: ApiClient;
  let token: string;

  test.beforeEach(async ({ request }) => {
    client = new ApiClient(request);
    token = await client.createToken('admin', 'password123');
  });

  test.describe('POST /booking', () => {
    test('creates a booking and returns the generated id and booking payload', async () => {
      const booking = sampleBooking();

      const response = await client.createBooking(booking);

      expect(response.status()).toBe(200);
      const body: CreateBookingResponse = await response.json();
      expect(typeof body.bookingid).toBe('number');
      expect(body.booking).toEqual(booking);

      await client.deleteBooking(body.bookingid, token);
    });
  });

  test.describe('GET /booking', () => {
    let bookingId: number;
    const booking = sampleBooking({ firstname: 'Filtered', lastname: 'Person' });

    test.beforeEach(async () => {
      const createResponse = await client.createBooking(booking);
      ({ bookingid: bookingId } = await createResponse.json());
    });

    test.afterEach(async () => {
      await client.deleteBooking(bookingId, token);
    });

    test('lists booking ids as an array of { bookingid }', async () => {
      const response = await client.getBookingIds();

      expect(response.status()).toBe(200);
      const ids: BookingId[] = await response.json();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.every((entry) => typeof entry.bookingid === 'number')).toBe(true);
      expect(ids.some((entry) => entry.bookingid === bookingId)).toBe(true);
    });

    test('filters booking ids by query params', async () => {
      const response = await client.getBookingIds({ firstname: booking.firstname, lastname: booking.lastname });

      expect(response.status()).toBe(200);
      const ids: BookingId[] = await response.json();
      expect(ids.some((entry) => entry.bookingid === bookingId)).toBe(true);
    });

    test('returns no ids for a filter that matches nothing', async () => {
      const response = await client.getBookingIds({ firstname: 'NoSuchFirstName-xyz' });

      expect(response.status()).toBe(200);
      const ids: BookingId[] = await response.json();
      expect(ids.length).toBe(0);
    });
  });

  test.describe('GET /booking/{id}', () => {
    let bookingId: number;
    const booking = sampleBooking();

    test.beforeEach(async () => {
      const createResponse = await client.createBooking(booking);
      ({ bookingid: bookingId } = await createResponse.json());
    });

    test.afterEach(async () => {
      await client.deleteBooking(bookingId, token);
    });

    test('returns the full booking payload for a valid id', async () => {
      const response = await client.getBooking(bookingId);

      expect(response.status()).toBe(200);
      await expect(response.json()).resolves.toEqual(booking);
    });

    test('returns 404 for a nonexistent id', async () => {
      const response = await client.getBooking(999999999);

      expect(response.status()).toBe(404);
    });
  });

  test.describe('PUT /booking/{id}', () => {
    let bookingId: number;
    const booking = sampleBooking();

    test.beforeEach(async () => {
      const createResponse = await client.createBooking(booking);
      ({ bookingid: bookingId } = await createResponse.json());
    });

    test.afterEach(async () => {
      await client.deleteBooking(bookingId, token);
    });

    test('updates the booking when authenticated', async () => {
      const updatedBooking: Booking = {
        ...booking,
        totalprice: booking.totalprice + 50,
        additionalneeds: 'Late checkout',
      };

      const response = await client.updateBooking(bookingId, updatedBooking, token);

      expect(response.status()).toBe(200);
      await expect(response.json()).resolves.toEqual(updatedBooking);

      const getResponse = await client.getBooking(bookingId);
      await expect(getResponse.json()).resolves.toEqual(updatedBooking);
    });
  });

  test.describe('DELETE /booking/{id}', () => {
    let bookingId: number;
    const booking = sampleBooking();

    test.beforeEach(async () => {
      const createResponse = await client.createBooking(booking);
      ({ bookingid: bookingId } = await createResponse.json());
    });

    test('deletes the booking when authenticated, and it becomes unretrievable', async () => {
      const deleteResponse = await client.deleteBooking(bookingId, token);
      expect(deleteResponse.status()).toBe(201);

      const getResponse = await client.getBooking(bookingId);
      expect(getResponse.status()).toBe(404);
    });
  });
});
