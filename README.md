
[![Playwright CI](https://github.com/WoodleyQA/Playwright_Project/actions/workflows/playwright.yml/badge.svg)](https://github.com/WoodleyQA/Playwright_Project/actions/workflows/playwright.yml)

# Playwright Test Automation

A Playwright + TypeScript project covering both UI and API test automation in a single framework, structured around the Page Object Model.

## Why this exists

Most teams end up running separate tools for UI and API testing — Selenium or Cypress for the browser, something else entirely for the API layer. Playwright supports both natively, which means one framework, one config, one CI pipeline, instead of maintaining two. This project is built around that idea: proving out UI and API coverage together, not as separate exercises.

## What's tested

**UI** — [automationintesting.online](https://automationintesting.online), a booking demo site. Covers the homepage, submitting a reservation, and admin login, using Page Objects to keep locators and interactions out of the test files themselves.

**API** — [restful-booker](https://restful-booker.herokuapp.com), a standalone REST API for the same domain (bookings). Full CRUD coverage — auth token flow, create/read/update/delete on bookings, and checks that auth-protected endpoints actually reject unauthenticated requests.

Worth noting: these are two separate demo projects by the same author, not one app tested two ways. They share a booking-domain theme, which is why they pair well here, but the UI and API suites aren't hitting the same backend.

## Known API behaviors surfaced by negative testing

Writing negative tests against restful-booker's live API surfaced a few
real quirks worth documenting rather than silently working around:

- **Auth never returns 4xx.** `POST /auth` with bad credentials still
  returns `200`, with `{ "reason": "Bad credentials" }` and no token.
  Tests assert on that actual response shape instead of a 4xx status
  the API never sends.
- **Missing required fields on booking creation return `500`,** not a
  graceful `400`. Treated as a documented finding, not a bug in this
  test suite.
- **Type mismatches aren't validated.** Sending `totalprice` as a
  string instead of a number is silently accepted with a `200`.

None of these were "fixed" in the tests — they're asserted as the
API's actual behavior, since faking a 4xx that never arrives would
just produce a permanently-failing test.

## Structure

```text
pages/       Page Objects for UI tests
api/         Request client + types for API tests
tests/ui/    UI test specs
tests/api/   API test specs
```

## Running it

```bash
npm install
npx playwright install
npx playwright test
```

CI runs on GitHub Actions against Chromium, Firefox, and WebKit on every push and PR.

## Real API behavior found via negative testing

`tests/api/negative.spec.ts` probes restful-booker's edge cases directly rather than assuming textbook REST semantics, and the live API doesn't always behave the way you'd expect:

- `POST /auth` always returns **200**, even for a bad username, bad password, or a completely empty body. There's no 4xx to check — the only failure signal is `{ reason: "Bad credentials" }` in the body with no `token`.
- `POST /booking` with required fields missing doesn't validate — it returns **500 Internal Server Error** (a server-side crash, not a graceful 4xx). Confirmed consistent across repeated calls.
- `POST /booking` with `totalprice` sent as a string isn't rejected — it's silently coerced to `null` and still returns 200.
- An invalid date range (checkout before checkin) isn't validated at all — accepted and echoed back as-is with 200.
- `PUT`/`DELETE` on a booking without a token both return **403** (not 401), and a rejected `DELETE` leaves the booking intact.
- `GET` on a non-existent booking id returns 404, as expected.

These aren't bugs in the tests — they're documented findings about the real API, which is the point of the negative suite.

## Real UI behavior found via negative testing

`tests/ui/validation.spec.ts` does the same thing on the UI side — probing the live automationintesting.online reservation and admin login forms rather than assuming they behave ideally:

- Blank required fields and a malformed email **are** validated properly — the guest details form shows a visible Bootstrap alert (e.g. "Firstname should not be blank", "must be a well-formed email address") and never reaches a success state.
- The **Phone field isn't actually type-checked** — only its length (11–21 characters) is validated server-side. A value made entirely of letters is accepted and the booking completes successfully.
- An **invalid date range (checkout before checkin) isn't validated client-side at all** — the price summary even displays a negative night count. On submit, the backend returns 409, which the frontend has no handler for — it crashes into Next.js's generic "This page couldn't load" error boundary instead of showing a validation message.
- Admin login with the wrong password correctly shows "Invalid credentials," stays on `/admin`, and no dashboard-only element (e.g. the rooms table) ever becomes visible.

As with the API suite, these are asserted as the site's actual behavior — including the crash on an invalid date range — rather than adjusted to assert the friendlier outcome that would ideally happen instead.

## Notes

Built iteratively — scaffold, API suite, UI suite, each as its own branch and PR, with CI gating merges to main. That's intentional: it mirrors how I'd actually want to work on a real team, not just script something end to end and dump it in one commit.
