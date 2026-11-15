import { APIRequestContext, test } from '@playwright/test';
import { BOOKING_PLATFORM_URL } from '../pages/bookingPlatformConfig';

// The UI suite runs against a public demo site we do not control. Its
// reservation page loads room data from /api/room/{id}; when that endpoint
// returns 500 the page spins forever and every test that needs it fails for a
// reason that has nothing to do with the code under test.
//
// Instead of letting those tests fail (a red build that says nothing about
// our code) or hiding them, probe the endpoint once per worker and skip the
// dependent tests with the reason stated in the report.
let probe: Promise<string | null> | undefined;

function probeRoomApi(request: APIRequestContext): Promise<string | null> {
  probe ??= (async () => {
    try {
      const response = await request.get(`${BOOKING_PLATFORM_URL}/api/room/1`, { timeout: 10_000 });
      return response.ok() ? null : `GET /api/room/1 returned ${response.status()}`;
    } catch (error) {
      return `GET /api/room/1 unreachable: ${(error as Error).message}`;
    }
  })();
  return probe;
}

// Call from a beforeEach (or the first line of a test) for anything that
// opens a /reservation/{id} page.
export async function skipIfReservationBackendDown(request: APIRequestContext): Promise<void> {
  const reason = await probeRoomApi(request);
  test.skip(reason !== null, `Upstream demo site is unhealthy (${reason}), so the reservation page cannot load.`);
}
