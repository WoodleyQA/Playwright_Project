import { APIResponse, test as base, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';
import { Booking, CreateBookingResponse } from '../../api/types';
import { sampleBooking } from './testData';

type CreatedBooking = { response: APIResponse; body: CreateBookingResponse };

type ApiFixtures = {
  client: ApiClient;
  token: string;
  createBooking: (overrides?: Partial<Booking>) => Promise<CreatedBooking>;
};

export const test = base.extend<ApiFixtures>({
  client: async ({ request }, use) => {
    await use(new ApiClient(request));
  },

  token: async ({ client }, use) => {
    await use(await client.createToken('admin', 'password123'));
  },

  // Creates a booking via the existing ApiClient and tracks its id. Teardown
  // (the code after `use()`) runs whether the test passed or failed, and
  // deletes every booking this fixture created during the test.
  createBooking: async ({ client, token }, use) => {
    const createdIds: number[] = [];

    await use(async (overrides) => {
      const response = await client.createBooking(sampleBooking(overrides));
      const body: CreateBookingResponse = await response.json();
      createdIds.push(body.bookingid);
      return { response, body };
    });

    await Promise.all(createdIds.map((id) => client.deleteBooking(id, token)));
  },
});

export { expect };
