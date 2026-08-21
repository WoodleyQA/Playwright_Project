import { expect } from '@playwright/test';

type FieldType = 'string' | 'number' | 'boolean';

interface FieldSpec {
  path: string;
  type: FieldType;
  optional?: boolean;
}

function getByPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (value, key) => (value === undefined || value === null ? undefined : (value as Record<string, unknown>)[key]),
      obj,
    );
}

// A small hand-rolled shape checker: for each field, confirm it's present,
// not unexpectedly null, and of the correct primitive type. Fields marked
// optional are skipped only when entirely absent (undefined) - if present,
// they still have to be the right type and non-null.
export function assertShape(body: unknown, fields: FieldSpec[]) {
  for (const field of fields) {
    const value = getByPath(body, field.path);

    if (field.optional && value === undefined) {
      continue;
    }

    expect(value, `expected "${field.path}" to be present`).not.toBeUndefined();
    expect(value, `expected "${field.path}" to not be null`).not.toBeNull();
    expect(typeof value, `expected "${field.path}" to be a ${field.type}`).toBe(field.type);
  }
}

export const BOOKING_FIELDS: FieldSpec[] = [
  { path: 'firstname', type: 'string' },
  { path: 'lastname', type: 'string' },
  { path: 'totalprice', type: 'number' },
  { path: 'depositpaid', type: 'boolean' },
  { path: 'bookingdates.checkin', type: 'string' },
  { path: 'bookingdates.checkout', type: 'string' },
  { path: 'additionalneeds', type: 'string', optional: true },
];

export const CREATE_BOOKING_RESPONSE_FIELDS: FieldSpec[] = [
  { path: 'bookingid', type: 'number' },
  ...BOOKING_FIELDS.map((field) => ({ ...field, path: `booking.${field.path}` })),
];

export const BOOKING_ID_FIELDS: FieldSpec[] = [{ path: 'bookingid', type: 'number' }];
