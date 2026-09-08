[![Playwright CI](https://github.com/WoodleyQA/Playwright_Project/actions/workflows/playwright.yml/badge.svg)](https://github.com/WoodleyQA/Playwright_Project/actions/workflows/playwright.yml)

# Playwright Test Automation

A Playwright + TypeScript project covering both UI and API test automation in a single framework, structured around the Page Object Model.

## Why this exists

Most teams end up running separate tools for UI and API testing — Selenium or Cypress for the browser, something else entirely for the API layer. Playwright supports both natively, which means one framework, one config, one CI pipeline, instead of maintaining two. This project is built around that idea: proving out UI and API coverage together, not as separate exercises.

## Design philosophy

Three things in here share a thesis: don't assume, don't guess, verify before you trust.

- **Negative testing** (below) probes real API/UI behavior instead of assuming textbook REST semantics or graceful validation — and asserts what the system actually does, including its failure modes.
- **Self-healing locators** (POC) only auto-accept a repaired locator above a confidence threshold — a shaky match gets flagged, not silently trusted.
- **Failure triage agent** classifies a test failure as regression/flake/stale-test with reasoning attached, instead of leaving that judgment call to whoever's skimming CI logs.

Same instinct that drives [eval-harness](https://github.com/WoodleyQA/eval-harness) — a system shouldn't trust its own output without evidence — applied here to test automation instead of LLM claim-checking.

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
scripts/     Standalone tooling (failure triage agent)
```

## Running it

```bash
npm install
npx playwright install
npx playwright test
```

CI runs on GitHub Actions against Chromium, Firefox, and WebKit on every push and PR.

## Self-healing locator proof of concept (requires ANTHROPIC_API_KEY)

`tests/ui/self-healing-locator.spec.ts` is the one test in this suite that makes a live call to the Anthropic API — everything else here only talks to restful-booker or automationintesting.online. It intentionally uses a broken locator, catches the resulting Playwright timeout, sends an accessibility snapshot of the page to Claude, and retries with the role/name Claude suggests.

To run it, set `ANTHROPIC_API_KEY` in your environment:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npx playwright test tests/ui/self-healing-locator.spec.ts
```

Without a key set, the test **skips** rather than failing or running against a mocked response — CI does not have this key, so it skips there too. See the comment block at the top of the file for why: a mocked LLM response would only prove the retry plumbing works, not that a real model can actually resolve a broken locator, which is the point of the test. It's also explicitly a proof of concept, not a pattern to copy into the rest of the suite — no caching, no confidence thresholds, no fallback chains, and every self-healing attempt adds real API latency and cost on top of the normal Playwright action.

## Failure triage agent (requires ANTHROPIC_API_KEY)

`scripts/triage-agent.js` sends a test failure's error output to Claude and classifies it as a `regression`, `environmental flake`, or `stale test`, with confidence, reasoning, and a suggested next step. It's a standalone CLI tool, not part of the Playwright suite itself — same `ANTHROPIC_API_KEY` requirement as the self-healing locator proof of concept.

```bash
export ANTHROPIC_API_KEY=sk-ant-...

# Classify every failure in a Playwright JSON reporter output file
npm run triage -- --report path/to/report.json

# Or classify a single failure's error/stack trace directly, for ad-hoc use
npm run triage -- --error "Error: expect(page).toHaveURL(...) failed ..."
```

This follows the same thesis as [eval-harness](https://github.com/WoodleyQA/eval-harness): don't guess, judge and explain. Just as eval-harness classifies each claim as supported/unsupported with a required rationale, `triage-agent.js` classifies each failure with confidence and reasoning attached — structured judgment over raw output, applied to a different failure mode.

## Known behaviors surfaced by negative testing

Both suites intentionally probe real API/UI edge cases rather than assuming ideal behavior — and assert what the system actually does, not what it should do.

**API** (`tests/api/negative.spec.ts`) — against restful-booker:

- `POST /auth` always returns **200**, even for a bad username, bad password, or a completely empty body. No 4xx to check — the only failure signal is `{ reason: "Bad credentials" }` in the body with no token.
- `POST /booking` with required fields missing returns **500 Internal Server Error**, not a graceful 400. Confirmed consistent across repeated calls.
- `POST /booking` with `totalprice` sent as a string isn't rejected — silently coerced to `null`, still returns 200.
- An invalid date range (checkout before checkin) isn't validated at all — accepted and echoed back as-is with 200.
- `PUT`/`DELETE` without a token both return **403** (not 401), and a rejected `DELETE` leaves the booking intact.
- `GET` on a non-existent booking id returns 404, as expected.

**UI** (`tests/ui/validation.spec.ts`) — against automationintesting.online:

- Blank required fields and a malformed email **are** validated properly — a visible Bootstrap alert appears (e.g. "Firstname should not be blank") and the form never reaches a success state.
- The **Phone field isn't actually type-checked** — only its length (11–21 characters) is validated server-side. A value made entirely of letters is accepted and the booking completes successfully.
- An **invalid date range isn't validated client-side at all** — the price summary even displays a negative night count. On submit, the backend returns 409, which the frontend has no handler for — it crashes into Next.js's generic "This page couldn't load" error boundary instead of showing a validation message.
- Admin login with the wrong password correctly shows "Invalid credentials," stays on `/admin`, and no dashboard-only element ever becomes visible.

None of these were "fixed" in the tests — they're asserted as the system's actual behavior, including the crash on an invalid date range, rather than adjusted to assert the friendlier outcome that would ideally happen instead.

## Notes

Built iteratively — scaffold, API suite, UI suite, each as its own branch and PR, with CI gating merges to main. That's intentional: it mirrors how I'd actually want to work on a real team, not just script something end-to-end and dump it in one commit.
