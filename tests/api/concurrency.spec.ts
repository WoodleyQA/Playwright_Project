import { expect, test } from './fixtures';

test.describe('Concurrent writes', () => {
  test('two concurrent PUT requests do not corrupt the booking into a mix of both', async ({
    createBooking,
    client,
    token,
  }) => {
    const { body: created } = await createBooking();
    const bookingA = { ...created.booking, totalprice: 100 };
    const bookingB = { ...created.booking, totalprice: 200 };

    const [responseA, responseB] = await Promise.all([
      client.updateBooking(created.bookingid, bookingA, token),
      client.updateBooking(created.bookingid, bookingB, token),
    ]);

    expect(responseA.status()).toBe(200);
    expect(responseB.status()).toBe(200);

    const getResponse = await client.getBooking(created.bookingid);
    const finalBooking = await getResponse.json();

    // Observed deterministic across repeated solo runs: the second request
    // in the Promise.all array always wins. Not asserted on here since
    // nothing in the API's contract guarantees that ordering.
    expect([bookingA, bookingB]).toContainEqual(finalBooking);
  });
});
