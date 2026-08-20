import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';

test.describe('POST /auth', () => {
  test('returns a token for valid credentials', async ({ request }) => {
    const client = new ApiClient(request);

    const response = await client.authenticate('admin', 'password123');
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
  });

  test('rejects invalid credentials without issuing a token', async ({ request }) => {
    const client = new ApiClient(request);

    const response = await client.authenticate('admin', 'wrong-password');
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.token).toBeUndefined();
    expect(body.reason).toBe('Bad credentials');
  });
});
