import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';

test.describe('Auth', () => {
  test('creates a token for valid credentials', async ({ request }) => {
    const client = new ApiClient(request);

    const token = await client.createToken('admin', 'password123');

    expect(token).toBeTruthy();
  });

  test('rejects invalid credentials', async ({ request }) => {
    const client = new ApiClient(request);

    const response = await client.authenticate('admin', 'wrong-password');
    const body = await response.json();

    expect(body.token).toBeUndefined();
    expect(body.reason).toBe('Bad credentials');
  });
});
