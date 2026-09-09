function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Spread across a multi-year window, far wider than the couple of years
// this session's manual exploration already exercised on this shared
// public demo, so a genuinely successful booking doesn't collide with a
// pre-existing one and trigger the same 409/crash that
// generateInvertedBookingDates() is used to deliberately exercise.
export function generateBookingDates(): { checkin: string; checkout: string } {
  const offsetDays = 1_000 + Math.floor(Math.random() * 4_000);
  const checkin = new Date(Date.now() + offsetDays * 86_400_000);
  const checkout = new Date(checkin.getTime() + 2 * 86_400_000);
  return { checkin: toISODate(checkin), checkout: toISODate(checkout) };
}

// Same window, but with checkout deliberately before checkin.
export function generateInvertedBookingDates(): { checkin: string; checkout: string } {
  const offsetDays = 1_000 + Math.floor(Math.random() * 4_000);
  const checkin = new Date(Date.now() + offsetDays * 86_400_000);
  const checkout = new Date(checkin.getTime() - 2 * 86_400_000);
  return { checkin: toISODate(checkin), checkout: toISODate(checkout) };
}
