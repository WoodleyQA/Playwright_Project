# Playwright Test Automation

A Playwright + TypeScript project covering both UI and API test automation in a single framework, structured around the Page Object Model.

## Why this exists

Most teams end up running separate tools for UI and API testing — Selenium or Cypress for the browser, something else entirely for the API layer. Playwright supports both natively, which means one framework, one config, one CI pipeline, instead of maintaining two. This project is built around that idea: proving out UI and API coverage together, not as separate exercises.

## What's tested

**UI** — [automationintesting.online](https://automationintesting.online), a booking demo site. Covers the homepage, submitting a reservation, and admin login, using Page Objects to keep locators and interactions out of the test files themselves.

**API** — [restful-booker](https://restful-booker.herokuapp.com), a standalone REST API for the same domain (bookings). Full CRUD coverage — auth token flow, create/read/update/delete on bookings, and checks that auth-protected endpoints actually reject unauthenticated requests.

Worth noting: these are two separate demo projects by the same author, not one app tested two ways. They share a booking-domain theme, which is why they pair well here, but the UI and API suites aren't hitting the same backend.

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

## Notes

Built iteratively — scaffold, API suite, UI suite, each as its own branch and PR, with CI gating merges to main. That's intentional: it mirrors how I'd actually want to work on a real team, not just script something end to end and dump it in one commit.
