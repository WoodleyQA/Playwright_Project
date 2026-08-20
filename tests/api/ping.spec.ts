import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';

test.describe('Ping', () => {
  test('service is healthy', async ({ request }) => {
    const client = new ApiClient(request);

    const response = await client.ping();

    expect(response.status()).toBe(201);
  });
});
