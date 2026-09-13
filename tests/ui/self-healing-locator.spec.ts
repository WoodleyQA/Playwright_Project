// PROOF OF CONCEPT — not a production system. This demonstrates the bare
// mechanism only: detect a locator timeout, ask an LLM to semantically
// resolve the element from an accessibility snapshot, retry once. A real
// implementation would need caching (so every run doesn't re-pay the LLM
// call for a locator that's broken every time), confidence thresholds
// (don't act on a low-confidence guess), fallback chains (try more than
// one candidate), and awareness that every self-heal attempt adds real
// API latency (a network round trip to Anthropic) and real cost (billed
// tokens) on top of the normal Playwright action.
//
// Accessibility snapshot API: this uses locator.ariaSnapshot() (current in
// Playwright 1.62.1, the version installed here — see package.json). The
// older page.accessibility.snapshot() API has been removed entirely from
// this version, not merely deprecated: there is no `Accessibility` class
// left in playwright-core's type definitions. ariaSnapshot() returns a
// human/LLM-readable role+name tree, which maps directly onto
// page.getByRole() for the retry step below.
//
// CI: this test needs a live ANTHROPIC_API_KEY, which CI does not have. It
// is skipped rather than run against a mocked LLM response, because a
// mocked response would only prove the retry plumbing works - it would not
// prove that a real model can actually resolve a broken locator from a
// snapshot, which is the entire point of this test. Skipping is the
// honest representation of "this capability is untested in CI," not a
// workaround to fake a pass.

import { test, expect, errors, Page } from '@playwright/test';
import Anthropic from '@anthropic-ai/sdk';
import { AdminLoginPage } from '../../pages/AdminLoginPage';
import { AdminDashboardPage } from '../../pages/AdminDashboardPage';

// The LLM's answer is only known at runtime, but Playwright's getByRole()
// takes a closed union of ARIA role strings - this narrows the JSON-parsed
// value to that union so the retry compiles without an `any` escape hatch.
type AriaRole = Parameters<Page['getByRole']>[0];

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const LOCATOR_SCHEMA = {
  type: 'object',
  properties: {
    role: {
      type: 'string',
      description: "ARIA role for Playwright's getByRole(), e.g. \"button\", \"link\".",
    },
    name: {
      type: 'string',
      description: "Accessible name for Playwright's getByRole(), matched against the element's visible text.",
    },
  },
  required: ['role', 'name'],
  additionalProperties: false,
};

interface HealedLocator {
  role: string;
  name: string;
}

async function healLocator(
  client: Anthropic,
  elementDescription: string,
  pageSnapshot: string,
): Promise<HealedLocator> {
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: LOCATOR_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content:
          `A Playwright locator just timed out trying to find an element on a web page.\n\n` +
          `Element I'm trying to find: ${elementDescription}\n\n` +
          `Here is the current page's accessibility snapshot:\n${pageSnapshot}\n\n` +
          `Identify the best-matching element in the snapshot and return the ARIA role ` +
          `and accessible name Playwright's page.getByRole(role, { name }) should use to find it.`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Expected a text content block with the healed locator, got none');
  }
  return JSON.parse(textBlock.text) as HealedLocator;
}

test.describe('Self-healing locator (proof of concept)', () => {
  test.skip(!ANTHROPIC_API_KEY, 'requires ANTHROPIC_API_KEY - see README');

  test('recovers from a broken locator by asking an LLM for the correct one', async ({ page, browserName }) => {
    // Runs once, on chromium only - not once per browser project. Two
    // reasons: it's needless 3x API cost/latency for a POC that isn't
    // testing browser-specific rendering, and this test holds the admin
    // login form open for several seconds (the broken-locator timeout plus
    // a live LLM round trip) before submitting - long enough to collide
    // with another project's concurrent admin login on this shared demo,
    // which appears to track "who's logged in as admin" as shared mutable
    // state rather than isolated per-session state.
    test.skip(browserName !== 'chromium', 'runs once on chromium only - see comment above');

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const login = new AdminLoginPage(page);
    const dashboard = new AdminDashboardPage(page);

    await login.open();
    await login.usernameInput.fill('admin');
    await login.passwordInput.fill('password');

    // Intentionally wrong: the real button's accessible name is "Login",
    // not "Log In" - simulating a selector that's gone stale after a copy
    // change.
    const brokenLoginButton = page.getByRole('button', { name: 'Log In' });

    let healed: HealedLocator | undefined;
    try {
      await brokenLoginButton.click({ timeout: 5000 });
    } catch (error) {
      if (!(error instanceof errors.TimeoutError)) {
        throw error;
      }

      const snapshot = await page.locator('body').ariaSnapshot();
      healed = await healLocator(
        client,
        'the button that submits the admin login form (logs the user in)',
        snapshot,
      );
      await page.getByRole(healed.role as AriaRole, { name: healed.name }).click();
    }

    expect(healed, 'expected the broken locator to time out and trigger self-healing').toBeDefined();
    await expect(page).toHaveURL(/\/admin\/rooms/);
    await expect(dashboard.roomNumberColumnHeader).toBeVisible();
  });
});
