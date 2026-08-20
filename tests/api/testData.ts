import { Booking } from '../../api/types';

export function sampleBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    firstname: 'Jim',
    lastname: 'Brown',
    totalprice: 111,
    depositpaid: true,
    bookingdates: { checkin: '2026-09-01', checkout: '2026-09-05' },
    additionalneeds: 'Breakfast',
    ...overrides,
  };
}
